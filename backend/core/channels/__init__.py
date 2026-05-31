from core.channels.registry import channel_registry

from core.channels.telegram.channel import (
    telegram_channel, )

channel_registry.register(telegram_channel)

