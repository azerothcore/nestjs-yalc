# API Strategy

This library implements a [strategy pattern](https://refactoring.guru/design-patterns/strategy
) and a [factory-pattern](https://refactoring.guru/design-patterns/factory-method
) that allow switching, at runtime, between different API types.

The main use case is to allow developers to implement calls or events in any application without taking care of the underlying implementation.
In this way you can switch between different API implementations and protocols without refactoring the entire code.

## Getting started

### Inject the provider

To inject the API strategy in your NestJS you can create a provider by using one of the following classes within a [custom provider useFactory](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory) in your Nest Module.

Direct call strategies:

* `NestLocalCallStrategy` - It uses [express/fastify inject](https://www.fastify.io/docs/latest/Guides/Testing/#benefits-of-using-fastifyinject)
* `NestHttpCallStrategy` - It uses [NestJS axiosRef](https://docs.nestjs.com/techniques/http-module#using-axios-directly)

Event strategies:

* `NestLocalEventStrategy` - It uses NestJS [Event Emitter](https://docs.nestjs.com/techniques/events#events) 

NOTE: you can even implement the `IApiCallStrategy`, the `IEventStrategy` or extends the `HttpAbstractStrategy` class to create your own implementation of the strategy. For example, you could implement your own `IEventStrategy` to integrate other event-based systems such as Kafka, RabbitMQ etc.

The library also provides a wrapper to define the useFactory by passing typed parameters:


#### For the local call
```typescript
    NestLocalCallStrategyProvider('YOUR_LOCAL_CALL_PROVIDER_ID', {
        NestLocalStrategy: NestLocalCallStrategy,
        baseUrl: '/',
    })
```

NOTE: You need to import the module containing the controller you are calling via the local-strategy to make it work. It's important to understand that the http call is emulated within the same runtime scope, so you will practically import both modules in the same app (the caller and the receiver).

#### For the HTTP calls
```typescript
    NestHttpCallStrategyProvider('YOUR_HTTP_CALL_PROVIDER_ID', {
        NestHttpStrategy: NestHttpCallStrategy,
        baseUrl: 'http://youdomain.com/',
    });
```

NOTE: You need to import the `HttpModule` from the [nestjs library](https://docs.nestjs.com/techniques/http-module) to make it work


#### For the event strategy
```typescript
    NestLocalEventStrategyProvider('YOUR_LOCAL_EVENT_PROVIDER_ID', {
        NestLocalStrategy: NestLocalEventStrategy,
    });
```


### How to use it 

Once you've injected the provider in your module, you can call it from any other provider/controller by doing:

```typescript
    constructor(
    @Inject(YOUR_HTTP_CALL_PROVIDER_ID)
    protected readonly serviceCaller: IHttpCallStrategy,
    @Inject(YOUR_LOCAL_EVENT_PROVIDER_ID)
    protected readonly serviceEvent: IEventStrategy,
    ) {}

    async yourMethod() {

        // DIRECT CALL (strong consistency)
        await this.serviceCaller.post('/your/endpoint', {
            data: { resourceId: userResId },
        });

        // OR VIA EVENT (eventual consistency)

        await this.serviceEvent.emitAsync('your.event.topic', {
            resourceId: userResId,
        });
    }
```

## Use cases:

* You need to start implementing a service-to-service communication using HTTP and switch to gRPC or TCP later on.
* You need to develop and emulate, via code, a microservice architecture before facing the complexity of deploying all the services separately and managing the API/Events infrastructure orchestration.
  You can then start using the local-call/local-event strategy and then switch to a different one in future.
* You can even switch between different API strategies depending on your environment variables, this can be useful for testing purpose or development.

