import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  toResponse(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return { fileUrl: `/uploads/payment-screenshots/${file.filename}` };
  }
}
