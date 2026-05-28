import { S3Client } from '@aws-sdk/client-s3';
import {
	BUCKET_ACCESS_KEY_ID,
	BUCKET_SECRET_ACCESS_KEY,
	BUCKET_REGION,
	BUCKET_ENDPOINT
} from '$env/static/private';

export const s3 = new S3Client({
	region: BUCKET_REGION,
	endpoint: BUCKET_ENDPOINT,
	credentials: {
		accessKeyId: BUCKET_ACCESS_KEY_ID,
		secretAccessKey: BUCKET_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,  // required for Railway and most non-AWS S3-compatible storage
});