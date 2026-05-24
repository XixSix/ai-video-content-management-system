import * as amqp from 'amqplib'
import type { ChannelModel } from 'amqplib'
import { config } from '../../config'

let rabbitConnection: ChannelModel | null = null
let connecting: Promise<ChannelModel> | null = null

export const connectRabbitMQ = async (): Promise<ChannelModel> => {
  if (rabbitConnection) {
    return rabbitConnection
  }

  connecting ??= amqp.connect(config.rabbitmq.url).then((connection: ChannelModel): ChannelModel => {
    rabbitConnection = connection
    connecting = null

    connection.on('error', (error: Error) => {
      console.error('RabbitMQ connection error', error)
    })

    connection.on('close', () => {
      rabbitConnection = null
    })

    return connection
  })

  return connecting
}

export const getRabbitMQConnection = (): ChannelModel => {
  if (!rabbitConnection) {
    throw new Error('RabbitMQ is not connected')
  }

  return rabbitConnection
}

export const disconnectRabbitMQ = async (): Promise<void> => {
  if (!rabbitConnection) {
    return
  }

  const connection = rabbitConnection
  rabbitConnection = null
  await connection.close()
}
