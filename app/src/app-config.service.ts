import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * This service is used to access the app config registered with a specific app alias.
 * This is useful when you want to access the config of the current app with the dependency injection and
 * without specifying the app alias.
 */
export class AppConfigService<T = any> {
  protected _config: T;

  constructor(
    public readonly service: ConfigService,
    protected readonly appAlias: string,
  ) {
    const config = this.service.get<T>(this.appAlias);
    if (!config) {
      throw new Error(
        `AppConfigService: No config found for app alias '${this.appAlias}'`,
      );
    }

    this._config = config;
  }

  /**
   * Type-safe access to the app config values of the current app.
   */
  get values(): T {
    return this._config;
  }

  /**
   * @deprecated - use .values instead
   */
  get(): T {
    return this.values;
  }
}

export function createAppConfigProvider(appAlias: string): Provider {
  return {
    provide: getAppConfigToken(appAlias),
    useFactory: (config: ConfigService): AppConfigService => {
      return new AppConfigService(config, appAlias);
    },
    inject: [ConfigService],
  };
}

export function getAppConfigToken(appAlias: string): string {
  return `${appAlias}Config`;
}

export function getAppEventToken(appAlias: string): string {
  return `${appAlias}Event`;
}

export function getAppLoggerToken(appAlias: string): string {
  return `${appAlias}Logger`;
}
