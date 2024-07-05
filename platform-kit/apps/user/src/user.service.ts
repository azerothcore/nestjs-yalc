import { GenericService } from '@nestjs-yalc/crud-gen/typeorm/generic.service.js';
import { YalcUserEntity } from './user.entity.js';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { GenericTypeORMRepository } from '@nestjs-yalc/crud-gen/typeorm/generic.repository.js';
import { Injectable } from '@nestjs/common';
import returnValue from '@nestjs-yalc/utils/returnValue.js';
import { TYPEORM_USER_CONNECTION_TOKEN } from './user.def.js';

// We are using a factory function to be able to pass the connection name dynamically
@Injectable()
export class YalcUserService extends GenericService<YalcUserEntity> {
  constructor(
    @InjectRepository(YalcUserEntity, TYPEORM_USER_CONNECTION_TOKEN)
    protected repository: GenericTypeORMRepository<YalcUserEntity>,
  ) {
    super(repository);
  }

  async resetPassword(guid: string) {
    // create a new random password
    const newPass = Array(12)
      .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
      .map(function (x) {
        return x[crypto.randomInt(0, 10_000) % x.length];
      })
      .join('');

    // update the selected user with the new password
    await this.getRepositoryWrite().update(
      { guid },
      { password: returnValue<string>(newPass) },
    );

    // send it back to the client
    return newPass;
  }
}
