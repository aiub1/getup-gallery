import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { serverEnv } from "@/lib/env.server";
import { r2Endpoint, r2ForcePathStyle, type R2Location } from "./host";

let client: S3Client | null = null;

export function r2Location(): R2Location {
  return { accountId: serverEnv.R2_ACCOUNT_ID, bucket: serverEnv.R2_BUCKET, endpoint: serverEnv.R2_ENDPOINT };
}

export function getR2Client(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: r2Endpoint(r2Location()),
    forcePathStyle: r2ForcePathStyle(r2Location()),
    credentials: {
      accessKeyId: serverEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: serverEnv.R2_SECRET_ACCESS_KEY,
    },
    // O SDK v3 acrescenta um checksum CRC32 do corpo por padrão. Numa URL
    // assinada de PUT ele entra na query com o valor do corpo VAZIO, e o R2
    // recusaria o arquivo de verdade. O tamanho já é garantido por
    // ContentLength assinado + HeadObject antes do insert.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}
