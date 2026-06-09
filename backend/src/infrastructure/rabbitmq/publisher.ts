import type { Options } from 'amqplib'
import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
import { getRabbitMQConnection } from './client'

interface PublishCeleryTaskInput {
  queueName: string
  taskName: string
  kwargs: Record<string, unknown>
  args?: unknown[]
  taskId?: string
  eta?: string
  options?: Options.Publish
}

export const publishJsonToQueue = async (
  queueName: string,
  message: Record<string, unknown>,
  options: Options.Publish = {}
): Promise<void> => {
  const connection = getRabbitMQConnection()
  const channel = await connection.createChannel()

  try {
    await channel.assertQueue(queueName, { durable: true })

    const published = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      contentType: 'application/json',
      persistent: true,
      ...options
    })

    if (!published) {
      throw new Error(`RabbitMQ publish buffer is full for queue ${queueName}`)
    }
  } finally {
    await channel.close()
  }
}

export const publishCeleryTaskToQueue = async ({
  queueName,
  taskName,
  kwargs,
  args = [],
  taskId = randomUUID(),
  eta = undefined,
  options = {}
}: PublishCeleryTaskInput): Promise<void> => {
  const connection = getRabbitMQConnection()
  const channel = await connection.createChannel()

  try {
    await channel.assertQueue(queueName, { durable: true })

    const body = [
      args,
      kwargs,
      {
        callbacks: null,
        errbacks: null,
        chain: null,
        chord: null
      }
    ]

    const headers = {
      lang: 'py',
      task: taskName,
      id: taskId,
      root_id: taskId,
      parent_id: null,
      group: null,

      // optional
      meth: null,
      shadow: null,
      eta,
      expires: null,
      retries: 0,
      timelimit: [null, null],
      argsrepr: JSON.stringify(args),
      kwargsrepr: JSON.stringify(kwargs),
      origin: `backend@${hostname()}`,
      replaced_task_nesting: 0
    }

    const published = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(body)), {
      contentType: 'application/json',
      contentEncoding: 'utf-8',
      persistent: true,
      correlationId: taskId,
      headers,
      ...options
    })

    if (!published) {
      throw new Error(`RabbitMQ publish buffer is full for queue ${queueName}`)
    }
  } finally {
    await channel.close()
  }
}
