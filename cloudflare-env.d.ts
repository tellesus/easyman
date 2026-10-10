declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    EASYMAN_SNAPSHOT_PUBLIC_JWK?: string;
    EASYMAN_SNAPSHOT_STATUS_TOKEN?: string;
  }
}
