import { proxyBackendPost } from "@/lib/api/backendProxy";

export async function POST(request: Request) {
  return proxyBackendPost(request, "/api/realtime/session/end");
}
