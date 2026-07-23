import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  uploadImage(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
    // cloudinary's own config cache is populated from process.env.CLOUDINARY_URL only
    // once, on its first call, and every module in this codebase is `require`d (static
    // imports) before @nestjs/config's dotenv loading runs — so by the time anything
    // here first touches `cloudinary`, that one-shot parse has already run against an
    // empty env and cached it that way. Passing `true` forces a fresh re-parse against
    // the now-populated process.env, which by request time always has it.
    cloudinary.config(true);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }
}
