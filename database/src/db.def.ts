import { ClassType } from '@nestjs-yalc/types/globals.d.ts';
import { MigrationInterface } from 'typeorm';

export type TMigrationList = ClassType<MigrationInterface>[];
