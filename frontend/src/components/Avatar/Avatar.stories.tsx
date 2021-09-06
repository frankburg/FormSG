import { Meta, Story } from '@storybook/react'

import { Avatar, AvatarProps } from './Avatar'

export default {
  title: 'Components/Avatar',
  component: Avatar,
} as Meta

type AvatarTemplateProps = AvatarProps

const AvatarTemplate: Story<AvatarTemplateProps> = (props) => {
  return <Avatar {...props}></Avatar>
}

export const Default = AvatarTemplate.bind({})
Default.args = {
  name: 'J S X',
  hasNotification: false,
}

export const WithNotification = AvatarTemplate.bind({})
WithNotification.args = {
  name: 'J S X',
  hasNotification: true,
}
