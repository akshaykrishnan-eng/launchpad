import { proxyAdminRequest } from "@/lib/admin/proxy";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { path } = await params;
  return proxyAdminRequest(request, path);
}

export async function POST(request: Request, { params }: RouteParams) {
  const { path } = await params;
  return proxyAdminRequest(request, path);
}
