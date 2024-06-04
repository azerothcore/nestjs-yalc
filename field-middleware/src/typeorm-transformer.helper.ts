import { DateHelper } from '@nestjs-yalc/utils/date.helper.js';
import { belongsToEnum } from '@nestjs-yalc/utils/enum.helper.js';
import { ValueTransformer } from 'typeorm';

/**
 * Function for transforming the unfitting enum data to null after reading it from the database
 * @param enumName: enum object for checking if the column value belongs to it
 * @returns ValueTransformer object
 */
export const enumTransformer = <T extends Record<string, string | number>>(
  enumName: T,
): ValueTransformer => {
  const transformer = (value: string | number) => {
    return belongsToEnum(enumName, value) ? value : null;
  };

  return {
    to: (value) => value, // no transformation for writing
    from: transformer,
  };
};

export const defaultDateTransformer = () => {
  const transform = (value?: Date) => {
    if (!value) {
      return DateHelper.dateToSQLDateTime(new Date());
    }

    return value;
  };

  return {
    from: (value: Date) => value,
    to: transform,
  };
};
