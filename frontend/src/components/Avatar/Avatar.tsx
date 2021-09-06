import {
  Avatar as ChakraAvatar,
  AvatarBadge as ChakraAvatarBadge,
  AvatarProps as ChakraAvatarProps,
} from '@chakra-ui/react'

export interface AvatarProps extends ChakraAvatarProps {
  hasNotification?: boolean
}

/*
 * Utility to extract first letter of avatar name
 * Override default getInitials Avatar method
 */
const getInitials = (name: string) => name[0]

/*
 * Avatar component
 */
export const Avatar = (props: AvatarProps): JSX.Element => {
  const avatarBadge = props.hasNotification ? <ChakraAvatarBadge /> : ''

  return (
    <ChakraAvatar {...props} getInitials={getInitials}>
      {avatarBadge}
    </ChakraAvatar>
  )
}
