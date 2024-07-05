import { EntityWithTimestamps } from '@nestjs-yalc/database/timestamp.entity.js';
import { HideField, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { YalcUserEntity } from './user.entity.js';

@Entity('phone')
@Index('unique_phone', ['phoneNumber', 'userId'], { unique: true })
@ObjectType({ isAbstract: true })
export class YalcUserPhoneEntity extends EntityWithTimestamps(BaseEntity) {
  // if not specifiec elsewhere
  // ID field name will be used by default from the single
  // resource get query as argument to use to select the resource
  @PrimaryGeneratedColumn('increment')
  ID!: number;

  @Column('varchar', { length: 20 })
  phoneNumber!: string;

  @Column('varchar', { length: 36 })
  userId!: string;

  @OneToOne(
    /* istanbul ignore next */
    () => YalcUserEntity,
    /* istanbul ignore next */
    (meta) => meta.SkeletonPhone,
  )
  @JoinColumn([{ name: 'userId', referencedColumnName: 'guid' }])
  @HideField()
  SkeletonUser?: Relation<YalcUserEntity>;
}
