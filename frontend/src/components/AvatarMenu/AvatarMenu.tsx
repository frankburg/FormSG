import {
  Box,
  ButtonProps,
  Icon,
  MenuItemProps,
  useMultiStyleConfig,
} from '@chakra-ui/react'

import { BxsUser } from '~/assets/icons/BxsUser'

import Menu from '../Menu'

/**
 * MenuButton styled for avatar
 * Used to wrap Avatar component
 * @preconditions Must be a child of Menu component,
 * and returned using a render prop (see implementation in Avatar.stories).
 */
export const AvatarMenuButton = (props: ButtonProps): JSX.Element => {
  return (
    <Menu.Button
      variant="clear"
      px="0"
      iconSpacing="0.5rem"
      color="secondary.300"
      {...props}
    ></Menu.Button>
  )
}

/**
 * MenuItem styled for avatar username
 * @preconditions Must be a child of Menu component,
 */
export const AvatarUsername = (props: MenuItemProps): JSX.Element => {
  const styles = useMultiStyleConfig('AvatarMenu', {})

  const userIcon = <Icon as={BxsUser} sx={styles.usernameIcon}></Icon>

  return (
    <Box sx={styles.usernameItem}>
      {userIcon}
      {props.children}
    </Box>
  )
}
