import {
  Avatar as ChakraAvatar,
  AvatarBadge as ChakraAvatarBadge,
  AvatarProps as ChakraAvatarProps,
} from '@chakra-ui/react'

export interface AvatarProps extends ChakraAvatarProps {
  hasNotification?: boolean
}

/*
 * Avatar component
 * May be wrapped in AvatarMenuButton
 */
export const Avatar = ({
  hasNotification,
  ...rest
}: AvatarProps): JSX.Element => {
  const avatarBadge = hasNotification ? <ChakraAvatarBadge /> : ''

  return (
    <ChakraAvatar
      getInitials={
        rest.getInitials ? rest.getInitials : (fullName) => fullName[0] // Extract first letter of avatar name
      }
      {...rest}
    >
      {avatarBadge}
    </ChakraAvatar>
  )
}
