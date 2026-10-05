import { proxyCandidateRequest } from "@/lib/candidate/proxy";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { path } = await params;
  return proxyCandidateRequest(request, path);
}

export async function POST(request: Request, { params }: RouteParams) {
  const { path } = await params;
  return proxyCandidateRequest(request, path);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { path } = await params;
  return proxyCandidateRequest(request, path);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { path } = await params;
  return proxyCandidateRequest(request, path);
}
