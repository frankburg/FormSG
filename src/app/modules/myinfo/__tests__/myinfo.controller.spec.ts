import { StatusCodes } from 'http-status-codes'
import { err, errAsync, ok, okAsync } from 'neverthrow'
import { mocked } from 'ts-jest/utils'

import { IFormSchema, ILoginSchema, IPopulatedForm } from 'src/types'

import expressHandler from 'tests/unit/backend/helpers/jest-express'

import { FormAuthType } from '../../../../../shared/types'
import * as BillingService from '../../billing/billing.service'
import { DatabaseError } from '../../core/core.errors'
import { FormNotFoundError } from '../../form/form.errors'
import * as FormService from '../../form/form.service'
import {
  MOCK_ERROR_CODE,
  MOCK_LOGIN_HTML,
} from '../../spcp/__tests__/spcp.test.constants'
import {
  FetchLoginPageError,
  LoginPageValidationError,
} from '../../spcp/spcp.errors'
import { SpcpService } from '../../spcp/spcp.service'
import { MYINFO_COOKIE_NAME, MYINFO_COOKIE_OPTIONS } from '../myinfo.constants'
import * as MyInfoController from '../myinfo.controller'
import { MyInfoFetchError } from '../myinfo.errors'
import { MyInfoService } from '../myinfo.service'
import { MyInfoCookieState } from '../myinfo.types'

import {
  MOCK_ACCESS_TOKEN,
  MOCK_AUTH_CODE,
  MOCK_COOKIE_AGE,
  MOCK_FORM_ID,
  MOCK_MYINFO_FORM,
  MOCK_REDIRECT_URL,
} from './myinfo.test.constants'

jest.mock('../myinfo.service')
const MockMyInfoService = mocked(MyInfoService, true)

jest.mock('../../form/form.service')
const MockFormService = mocked(FormService, true)

jest.mock('../../spcp/spcp.service')
const MockSpcpService = mocked(SpcpService, true)

jest.mock('../../billing/billing.service')
const MockBillingService = mocked(BillingService, true)

describe('MyInfoController', () => {
  afterEach(() => jest.clearAllMocks())

  describe('handleRedirectURLRequest', () => {
    const mockReq = expressHandler.mockRequest({
      query: {
        formId: MOCK_FORM_ID,
      },
    })
    const mockRes = expressHandler.mockResponse()

    it('should respond with redirect URL when form is valid MyInfo form', async () => {
      MockFormService.retrieveFormById.mockReturnValueOnce(
        okAsync(MOCK_MYINFO_FORM),
      )
      MockMyInfoService.createRedirectURL.mockReturnValueOnce(
        ok(MOCK_REDIRECT_URL),
      )

      await MyInfoController.respondWithRedirectURL(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.createRedirectURL).toHaveBeenCalledWith({
        formEsrvcId: MOCK_MYINFO_FORM.esrvcId,
        formId: MOCK_MYINFO_FORM._id,
        requestedAttributes: MOCK_MYINFO_FORM.getUniqueMyInfoAttrs(),
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        redirectURL: MOCK_REDIRECT_URL,
      })
    })

    it('should return 404 when form is not found', async () => {
      MockFormService.retrieveFormById.mockReturnValueOnce(
        errAsync(new FormNotFoundError()),
      )

      await MyInfoController.respondWithRedirectURL(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.createRedirectURL).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        message: expect.any(String),
      })
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND)
    })

    it('should return 400 when form is not a MyInfo form', async () => {
      MockFormService.retrieveFormById.mockReturnValueOnce(
        okAsync({ ...MOCK_MYINFO_FORM, authType: 'SP' } as IFormSchema),
      )

      await MyInfoController.respondWithRedirectURL(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.createRedirectURL).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        message: expect.any(String),
      })
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST)
    })

    it('should return 500 when database error occurs', async () => {
      MockFormService.retrieveFormById.mockReturnValueOnce(
        errAsync(new DatabaseError()),
      )

      await MyInfoController.respondWithRedirectURL(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.createRedirectURL).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({
        message: expect.any(String),
      })
      expect(mockRes.status).toHaveBeenCalledWith(
        StatusCodes.INTERNAL_SERVER_ERROR,
      )
    })
  })

  describe('checkMyInfoEServiceId', () => {
    const mockReq = expressHandler.mockRequest({
      query: {
        formId: MOCK_FORM_ID,
      },
    })
    const mockRes = expressHandler.mockResponse()

    beforeEach(() => {
      MockFormService.retrieveFormById.mockReturnValueOnce(
        okAsync(MOCK_MYINFO_FORM),
      )
    })

    it('should return 200 with isValid true if validation passes', async () => {
      MockSpcpService.createRedirectUrl.mockReturnValueOnce(
        ok(MOCK_REDIRECT_URL),
      )
      MockSpcpService.fetchLoginPage.mockReturnValueOnce(
        okAsync(MOCK_LOGIN_HTML),
      )
      MockSpcpService.validateLoginPage.mockReturnValueOnce(
        ok({ isValid: true }),
      )

      await MyInfoController.checkMyInfoEServiceId(mockReq, mockRes, jest.fn())

      expect(MockSpcpService.createRedirectUrl).toHaveBeenCalledWith(
        FormAuthType.SP,
        MOCK_MYINFO_FORM._id,
        MOCK_MYINFO_FORM.esrvcId,
      )
      expect(MockSpcpService.fetchLoginPage).toHaveBeenCalledWith(
        MOCK_REDIRECT_URL,
      )
      expect(MockSpcpService.validateLoginPage).toHaveBeenCalledWith(
        MOCK_LOGIN_HTML,
      )
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK)
      expect(mockRes.json).toHaveBeenCalledWith({
        isValid: true,
      })
    })

    it('should return 200 with isValid false if validation fails', async () => {
      MockSpcpService.createRedirectUrl.mockReturnValueOnce(
        ok(MOCK_REDIRECT_URL),
      )
      MockSpcpService.fetchLoginPage.mockReturnValueOnce(
        okAsync(MOCK_LOGIN_HTML),
      )
      MockSpcpService.validateLoginPage.mockReturnValueOnce(
        ok({ isValid: false, errorCode: MOCK_ERROR_CODE }),
      )

      await MyInfoController.checkMyInfoEServiceId(mockReq, mockRes, jest.fn())

      expect(MockSpcpService.createRedirectUrl).toHaveBeenCalledWith(
        FormAuthType.SP,
        MOCK_MYINFO_FORM._id,
        MOCK_MYINFO_FORM.esrvcId,
      )
      expect(MockSpcpService.fetchLoginPage).toHaveBeenCalledWith(
        MOCK_REDIRECT_URL,
      )
      expect(MockSpcpService.validateLoginPage).toHaveBeenCalledWith(
        MOCK_LOGIN_HTML,
      )
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK)
      expect(mockRes.json).toHaveBeenCalledWith({
        isValid: false,
        errorCode: MOCK_ERROR_CODE,
      })
    })

    it('should return 503 when FetchLoginPageError occurs', async () => {
      MockSpcpService.createRedirectUrl.mockReturnValueOnce(
        ok(MOCK_REDIRECT_URL),
      )
      MockSpcpService.fetchLoginPage.mockReturnValueOnce(
        errAsync(new FetchLoginPageError()),
      )

      await MyInfoController.checkMyInfoEServiceId(mockReq, mockRes, jest.fn())

      expect(MockSpcpService.createRedirectUrl).toHaveBeenCalledWith(
        FormAuthType.SP,
        MOCK_MYINFO_FORM._id,
        MOCK_MYINFO_FORM.esrvcId,
      )
      expect(MockSpcpService.fetchLoginPage).toHaveBeenCalledWith(
        MOCK_REDIRECT_URL,
      )
      expect(MockSpcpService.validateLoginPage).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(
        StatusCodes.SERVICE_UNAVAILABLE,
      )
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Failed to contact SingPass. Please try again.',
      })
    })

    it('should return 503 when LoginPageValidationError occurs', async () => {
      MockSpcpService.createRedirectUrl.mockReturnValueOnce(
        ok(MOCK_REDIRECT_URL),
      )
      MockSpcpService.fetchLoginPage.mockReturnValueOnce(
        okAsync(MOCK_LOGIN_HTML),
      )
      MockSpcpService.validateLoginPage.mockReturnValueOnce(
        err(new LoginPageValidationError()),
      )

      await MyInfoController.checkMyInfoEServiceId(mockReq, mockRes, jest.fn())

      expect(MockSpcpService.createRedirectUrl).toHaveBeenCalledWith(
        FormAuthType.SP,
        MOCK_MYINFO_FORM._id,
        MOCK_MYINFO_FORM.esrvcId,
      )
      expect(MockSpcpService.fetchLoginPage).toHaveBeenCalledWith(
        MOCK_REDIRECT_URL,
      )
      expect(MockSpcpService.validateLoginPage).toHaveBeenCalledWith(
        MOCK_LOGIN_HTML,
      )
      expect(mockRes.status).toHaveBeenCalledWith(
        StatusCodes.SERVICE_UNAVAILABLE,
      )
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Failed to contact SingPass. Please try again.',
      })
    })
  })

  describe('loginToMyInfo', () => {
    const mockState = {
      formId: MOCK_MYINFO_FORM._id,
      uuid: 'uuid',
      cookieDuration: MOCK_COOKIE_AGE,
    }
    const expectedCookieOptions = MYINFO_COOKIE_OPTIONS
    const mockReq = expressHandler.mockRequest({
      query: {
        code: MOCK_AUTH_CODE,
        state: JSON.stringify(mockState),
      },
    })
    const mockRes = expressHandler.mockResponse()

    beforeEach(() => {
      MockFormService.retrieveFullFormById.mockReturnValue(
        okAsync(MOCK_MYINFO_FORM as IPopulatedForm),
      )
      MockMyInfoService.parseMyInfoRelayState.mockReturnValue(ok(mockState))
      MockMyInfoService.retrieveAccessToken.mockReturnValue(
        okAsync(MOCK_ACCESS_TOKEN),
      )
      // Return value is ignored
      MockBillingService.recordLoginByForm.mockReturnValue(
        okAsync({} as unknown as ILoginSchema),
      )
    })

    it('should set cookie and redirect to correct destination when login is valid', async () => {
      await MyInfoController.loginToMyInfo(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFullFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.retrieveAccessToken).toHaveBeenCalledWith(
        MOCK_AUTH_CODE,
      )
      expect(MockBillingService.recordLoginByForm).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM,
      )
      expect(mockRes.cookie).toHaveBeenCalledWith(
        MYINFO_COOKIE_NAME,
        {
          accessToken: MOCK_ACCESS_TOKEN,
          usedCount: 0,
          state: MyInfoCookieState.Success,
        },
        { ...expectedCookieOptions, maxAge: MOCK_COOKIE_AGE },
      )
      expect(mockRes.redirect).toHaveBeenCalledWith(`/${MOCK_MYINFO_FORM._id}`)
    })

    it('should redirect to home page when destination is not valid', async () => {
      MockFormService.retrieveFullFormById.mockReturnValue(
        errAsync(new FormNotFoundError()),
      )

      await MyInfoController.loginToMyInfo(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFullFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.retrieveAccessToken).not.toHaveBeenCalled()
      expect(MockBillingService.recordLoginByForm).not.toHaveBeenCalled()
      expect(mockRes.cookie).not.toHaveBeenCalled()
      expect(mockRes.redirect).toHaveBeenCalledWith(`/`)
    })

    it('should set error cookie and redirect to form when form is not MyInfo-authenticated', async () => {
      MockFormService.retrieveFullFormById.mockReturnValue(
        okAsync({
          ...MOCK_MYINFO_FORM,
          // Modify authType to SingPass
          authType: FormAuthType.SP,
        } as IPopulatedForm),
      )

      await MyInfoController.loginToMyInfo(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFullFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.retrieveAccessToken).not.toHaveBeenCalled()
      expect(MockBillingService.recordLoginByForm).not.toHaveBeenCalled()
      expect(mockRes.cookie).toHaveBeenCalledWith(
        MYINFO_COOKIE_NAME,
        {
          state: MyInfoCookieState.Error,
        },
        expectedCookieOptions,
      )
      expect(mockRes.redirect).toHaveBeenCalledWith(`/${MOCK_MYINFO_FORM._id}`)
    })

    it('should set error cookie and redirect to form when consent flow is not successful', async () => {
      const mockErrorReq = expressHandler.mockRequest({
        query: {
          error: 'error',
          'error-description': 'error-description',
          state: JSON.stringify(mockState),
        },
      })

      await MyInfoController.loginToMyInfo(mockErrorReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFullFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.retrieveAccessToken).not.toHaveBeenCalled()
      expect(MockBillingService.recordLoginByForm).not.toHaveBeenCalled()
      expect(mockRes.cookie).toHaveBeenCalledWith(
        MYINFO_COOKIE_NAME,
        {
          state: MyInfoCookieState.Error,
        },
        expectedCookieOptions,
      )
      expect(mockRes.redirect).toHaveBeenCalledWith(`/${MOCK_MYINFO_FORM._id}`)
    })

    it('should set error cookie and redirect to form when access token is invalid', async () => {
      MockMyInfoService.retrieveAccessToken.mockReturnValue(
        errAsync(new MyInfoFetchError()),
      )

      await MyInfoController.loginToMyInfo(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFullFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.retrieveAccessToken).toHaveBeenCalledWith(
        MOCK_AUTH_CODE,
      )
      expect(MockBillingService.recordLoginByForm).not.toHaveBeenCalled()
      expect(mockRes.cookie).toHaveBeenCalledWith(
        MYINFO_COOKIE_NAME,
        {
          state: MyInfoCookieState.Error,
        },
        expectedCookieOptions,
      )
      expect(mockRes.redirect).toHaveBeenCalledWith(`/${MOCK_MYINFO_FORM._id}`)
    })

    it('should set error cookie and redirect to form when recording login is unsuccessful', async () => {
      MockBillingService.recordLoginByForm.mockReturnValue(
        errAsync(new DatabaseError()),
      )

      await MyInfoController.loginToMyInfo(mockReq, mockRes, jest.fn())

      expect(MockFormService.retrieveFullFormById).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM._id,
      )
      expect(MockMyInfoService.retrieveAccessToken).toHaveBeenCalledWith(
        MOCK_AUTH_CODE,
      )
      expect(MockBillingService.recordLoginByForm).toHaveBeenCalledWith(
        MOCK_MYINFO_FORM,
      )
      expect(mockRes.cookie).toHaveBeenCalledWith(
        MYINFO_COOKIE_NAME,
        {
          state: MyInfoCookieState.Error,
        },
        expectedCookieOptions,
      )
      expect(mockRes.redirect).toHaveBeenCalledWith(`/${MOCK_MYINFO_FORM._id}`)
    })
  })
})
