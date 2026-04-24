import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // This line turns on our defensive validation globally
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, // Strips away any extra random data users try to send
    forbidNonWhitelisted: true, // Throws an error if they send unrecognized fields
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();