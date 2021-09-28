import { Box, SimpleGrid } from '@chakra-ui/react'
import { Meta, Story } from '@storybook/react'

import { Avatar } from './Avatar'

export default {
  title: 'Components/Avatar',
  component: Avatar,
} as Meta

type AvatarTemplateProps = {
  hasNotification?: boolean
}

const AvatarTemplate: Story<AvatarTemplateProps> = ({ hasNotification }) => {
  return <Avatar hasNotification={hasNotification}></Avatar>
}

const AvatarGroupTemplate: Story = () => {
  return (
    <SimpleGrid
      columns={2}
      spacingX={'100px'}
      spacingY={'50px'}
      alignItems="center"
      templateColumns="min-content min-content"
    >
      <Box>With Notification</Box>
      <Box>
        <AvatarTemplate hasNotification={true}></AvatarTemplate>
      </Box>
      <Box>Without Notification</Box>
      <Box>
        <AvatarTemplate hasNotification={false}></AvatarTemplate>
      </Box>
    </SimpleGrid>
  )
}
export const Default = AvatarGroupTemplate.bind({})
