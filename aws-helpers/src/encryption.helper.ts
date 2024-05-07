import aws from 'aws-sdk';
import * as localEncryption from '@nestjs-yalc/utils/encryption.helper.js';
import { PromiseResult } from 'aws-sdk/lib/request.js';
import { Logger } from '@nestjs/common';

/**
 *  Used for everything locally, must still be passed since sometimes we want to use other keys
 * (think encryptionKey on for example user identity document)
 * @todo put this in a config file
 */
export const staticKey =
  'be088f8bb64166cc2938b1dd0c9db8fa223edd975f48462858a41f70ebee1c5f';

export enum EncryptMode {
  AWS,
  LOCAL,
}

export const decryptCallback = (resolve: any, reject: any) => {
  return (err: any, data: any) => {
    if (err) {
      return reject(err);
    }
    data.Plaintext =
      typeof data.Plaintext === 'undefined' ? '' : data.Plaintext;
    return resolve(data.Plaintext.toString());
  };
};

export const asyncDecrypt = async (toDecrypt: any): Promise<string> => {
  const kms = new aws.KMS({
    region: process.env.KMS_REGION,
  });
  return new Promise((resolve, reject) => {
    kms.decrypt(
      {
        KeyId: process.env.AWS_REMOTE_KEYID,
        CiphertextBlob: Buffer.from(toDecrypt, 'base64'),
      },
      decryptCallback(resolve, reject),
    );
  });
};

// return reject to prevent further func execution (although promise result won't change after reject/resolve)
// also guarantees typescript safety
export const asyncEncrypt = async (toEncrypt: string): Promise<string> => {
  const kms = new aws.KMS({
    region: process.env.KMS_REGION,
  });
  const encryptionResult: aws.KMS.CiphertextType = await new Promise(
    (resolve, reject) => {
      // This should never occur, as this function is only called remotely. Throw Error just in case of bad remote env.
      if (typeof process.env.AWS_REMOTE_KEYID === 'undefined') {
        throw new Error(
          'Calling kms encrypt function without setting the AWS_REMOTE_KEYID variable',
        );
      }
      kms.encrypt(
        {
          KeyId: process.env.AWS_REMOTE_KEYID,
          Plaintext: toEncrypt,
        },
        (err, data) => {
          if (err) {
            return reject(err);
          }
          if (typeof data.CiphertextBlob === 'undefined') {
            return reject(
              'Error CiphertextBlob coming from kms encrypt is undefined',
            );
          }
          resolve(data.CiphertextBlob);
        },
      );
    },
  );
  return encryptionResult.toString('base64');
};

/**
 * Method used to decrypt string with AWS. In case of local environment it performs a localEncryption with a staticKey as default
 * @param toDecrypt
 * @param encryptionKey
 * @returns
 */
export const decryptString = async (
  toDecrypt: any,
  encryptMode: EncryptMode,
  encryptionKey = staticKey,
): Promise<string> => {
  switch (encryptMode) {
    case EncryptMode.AWS: {
      const decryptionResult: string = await asyncDecrypt(toDecrypt);
      return decryptionResult.toString();
    }
    case EncryptMode.LOCAL:
    default:
      return localEncryption.decryptAes(toDecrypt, encryptionKey);
  }
};

/**
 * Method used to encryptString with AWS. In case of local environment it performs a localEncryption with a staticKey as default
 * @param toDecrypt
 * @param encryptionKey
 * @returns
 */
export const encryptString = async (
  toEncrypt: any,
  encryptMode: EncryptMode,
  encryptionKey = staticKey,
): Promise<string> => {
  switch (encryptMode) {
    case EncryptMode.AWS: {
      const encryptionResult: string = await asyncEncrypt(toEncrypt);
      return encryptionResult;
    }
    case EncryptMode.LOCAL:
    default:
      return localEncryption.encryptAes(toEncrypt, encryptionKey);
  }
};

const cachedSsmVariables = new Map<
  string,
  Promise<PromiseResult<aws.SSM.GetParameterResult, aws.AWSError>>
>();

export const decryptSsmVariable = async (
  toDecrypt: string,
  useCache: boolean = true,
): Promise<string> => {
  if (useCache) {
    if (cachedSsmVariables.has(toDecrypt)) {
      const cachedValue = cachedSsmVariables.get(toDecrypt)!;

      const value = await cachedValue;
      // Logger.debug(
      //   `decryptSsmVariable cached ${toDecrypt}: ${value.Parameter?.Value}`,
      // );
      return value.Parameter?.Value ?? '';
    }
  }

  const ssm = new aws.SSM();
  try {
    Logger.debug('decryptSsmVariable getting...' + toDecrypt);

    const dataPromise = ssm
      .getParameter({ Name: toDecrypt, WithDecryption: true })
      .promise();

    if (useCache) {
      cachedSsmVariables.set(toDecrypt, dataPromise);
    }

    const data = await dataPromise;

    // Logger.debug(
    //   `decryptSsmVariable got ${toDecrypt}: ${data.Parameter?.Value}`,
    // );

    return data.Parameter?.Value ?? '';
  } catch (err) {
    Logger.error(
      `Error while decrypting ssm variable ${toDecrypt} ${JSON.stringify(err)}`,
    );
    return '';
  }
};

export const setEnvironmentVariablesFromSsm = async (
  envVariableToDecrypt: Record<string, string>,
  useCache: boolean = true,
): Promise<Record<string, string>> => {
  const ssmVars: Record<string, string> = {};
  const promises = Object.entries(envVariableToDecrypt).map(
    async ([envVar, ssmVar]) => {
      const value = await decryptSsmVariable(ssmVar, useCache);
      process.env[envVar] = ssmVars[envVar] = value;

      // Logger.debug(`Process env: ${envVar} set to ${process.env[envVar]}`);
    },
  );

  await Promise.all(promises);
  return ssmVars;
};
