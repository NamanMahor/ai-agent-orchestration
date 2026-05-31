class ChannelRegistry:

    def __init__(self):

        self.channels = {}

    def register(self, channel):

        self.channels[channel.type] = channel

    def get(self, channel_type):

        return self.channels.get(channel_type)

    def list(self):

        return list(self.channels.values())


channel_registry = ChannelRegistry()