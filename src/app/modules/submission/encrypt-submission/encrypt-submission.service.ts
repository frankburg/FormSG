import Bluebird from 'bluebird'
import mongoose from 'mongoose'
import { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow'
import { Transform } from 'stream'

import { aws as AwsConfig } from '../../../../config/config'
import { createLoggerWithLabel } from '../../../../config/logger'
import { SubmissionCursorData, SubmissionData } from '../../../../types'
import { getEncryptSubmissionModel } from '../../../models/submission.server.model'
import { isMalformedDate } from '../../../utils/date'
import { getMongoErrorMessage } from '../../../utils/handle-mongo-error'
import { DatabaseError, MalformedParametersError } from '../../core/core.errors'
import { CreatePresignedUrlError } from '../../form/admin-form/admin-form.errors'
import { SubmissionNotFoundError } from '../submission.errors'

const logger = createLoggerWithLabel(module)
const EncryptSubmissionModel = getEncryptSubmissionModel(mongoose)

/**
 * Returns a cursor to the stream of the submissions of the given form id.
 *
 * @param formId the id of the form to stream responses for
 * @param dateRange optional. The date range to limit responses to
 *
 * @returns ok(stream cursor) if created successfully
 * @returns err(MalformedParametersError) if given dates are invalid dates
 */
export const getSubmissionCursor = (
  formId: string,
  dateRange: {
    startDate?: string
    endDate?: string
  } = {},
): Result<
  ReturnType<typeof EncryptSubmissionModel.getSubmissionCursorByFormId>,
  MalformedParametersError
> => {
  if (
    isMalformedDate(dateRange.startDate) ||
    isMalformedDate(dateRange.endDate)
  ) {
    return err(new MalformedParametersError('Malformed date parameter'))
  }

  return ok(
    EncryptSubmissionModel.getSubmissionCursorByFormId(formId, dateRange),
  )
}

/**
 * Returns a Transform pipeline that transforms all attachment metadata of each
 * data chunk from the object path to the S3 signed URL so it can be retrieved
 * by the client.
 * @param enabled whether to perform any transformation
 * @param urlValidDuration how long to keep the S3 signed URL valid for
 * @returns a Transform pipeline to perform transformations on the pipe
 */
export const transformAttachmentMetaStream = ({
  enabled,
  urlValidDuration,
}: {
  enabled: boolean
  urlValidDuration: number
}): Transform => {
  return new Transform({
    objectMode: true,
    transform: (data: SubmissionCursorData, _encoding, callback) => {
      const unprocessedMetadata = data.attachmentMetadata ?? {}
      const totalCount = Object.keys(unprocessedMetadata).length
      // Early return if pipe is disabled or nothing to transform.
      if (!enabled || totalCount === 0) {
        data.attachmentMetadata = {}
        return callback(null, data)
      }

      const transformedMetadata: Record<string, string> = {}
      let processedCount = 0

      for (const [key, objectPath] of Object.entries(unprocessedMetadata)) {
        AwsConfig.s3.getSignedUrl(
          'getObject',
          {
            Bucket: AwsConfig.attachmentS3Bucket,
            Key: objectPath,
            Expires: urlValidDuration,
          },
          (error, url) => {
            if (error) {
              logger.error({
                message: 'Error occured whilst retrieving signed URL from S3',
                meta: {
                  action: 'transformAttachmentMetaStream',
                  key,
                  objectPath,
                },
                error,
              })
              return callback(error)
            }

            transformedMetadata[key] = url
            processedCount += 1

            // Finished processing, replace current attachment metadata with the
            // signed URLs.
            if (processedCount === totalCount) {
              data.attachmentMetadata = transformedMetadata
              return callback(null, data)
            }
          },
        )
      }
    },
  })
}

/**
 * Retrieves required subset of encrypted submission data from the database
 * @param formId the id of the form to filter submissions for
 * @param submissionId the submission itself to retrieve
 * @returns ok(SubmissionData)
 * @returns err(SubmissionNotFoundError) if given submissionId does not exist in the database
 * @returns err(DatabaseError) when error occurs during query
 */
export const getEncryptedSubmissionData = (
  formId: string,
  submissionId: string,
): ResultAsync<SubmissionData, SubmissionNotFoundError | DatabaseError> => {
  return ResultAsync.fromPromise(
    EncryptSubmissionModel.findEncryptedSubmissionById(formId, submissionId),
    (error) => {
      logger.error({
        message: 'Failure retrieving encrypted submission from database',
        meta: {
          action: 'getEncryptedSubmissionData',
          formId,
          submissionId,
        },
        error,
      })

      return new DatabaseError(getMongoErrorMessage(error))
    },
  ).andThen((submission) => {
    if (!submission) {
      logger.error({
        message: 'Unable to find encrypted submission from database',
        meta: {
          action: 'getEncryptedResponse',
          formId,
          submissionId,
        },
      })
      return errAsync(
        new SubmissionNotFoundError(
          'Unable to find encrypted submission from database',
        ),
      )
    }

    return okAsync(submission)
  })
}

/**
 * Transforms given attachment metadata to their S3 signed url counterparts.
 * @param attachmentMetadata the metadata to transform
 * @param urlValidDuration the duration the S3 signed url will be valid for
 * @returns ok(map with object path replaced with their signed url counterparts)
 * @returns err(CreatePresignedUrlError) if any of the signed url creation processes results in an error
 */
export const transformAttachmentMetasToSignedUrls = (
  attachmentMetadata: Map<string, string> | undefined,
  urlValidDuration: number,
): ResultAsync<Record<string, string>, CreatePresignedUrlError> => {
  if (!attachmentMetadata) {
    return okAsync({})
  }
  const keyToSignedUrlPromises: Record<string, Promise<string>> = {}

  for (const [key, objectPath] of attachmentMetadata) {
    keyToSignedUrlPromises[key] = AwsConfig.s3.getSignedUrlPromise(
      'getObject',
      {
        Bucket: AwsConfig.attachmentS3Bucket,
        Key: objectPath,
        Expires: urlValidDuration,
      },
    )
  }

  return ResultAsync.fromPromise(
    Bluebird.props(keyToSignedUrlPromises),
    (error) => {
      logger.error({
        message: 'Failed to retrieve signed URLs for attachments',
        meta: {
          action: 'transformAttachmentMetasToSignedUrls',
          attachmentMetadata,
        },
        error,
      })

      return new CreatePresignedUrlError('Failed to create attachment URL')
    },
  )
}