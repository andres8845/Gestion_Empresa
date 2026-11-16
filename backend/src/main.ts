import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Mercadito Daniela API')
    .setDescription('Autenticación y consulta de usuarios autorizados.')
    .setVersion('1.0')
    .addCookieAuth('md_session', { type: 'apiKey', in: 'cookie' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
