import AWS from 'aws-sdk';
import { AWSError } from 'aws-sdk';

interface SqsConfig {
  endpoint: string;
  region: string;
  queueName: string;
}

export const pushToAwsSQS = async (
  config: SqsConfig,
  message: any,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const sqs = new AWS.SQS({ region: config.region });
    sqs.sendMessage(
      {
        QueueUrl: config.endpoint + config.queueName,
        MessageBody: message,
      },
      (error: AWSError) => {
        if (error) {
          reject(error);
        }
        resolve();
      },
    );
  });
};
