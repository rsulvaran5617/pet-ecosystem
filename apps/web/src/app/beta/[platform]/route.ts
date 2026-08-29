import { NextRequest, NextResponse } from "next/server";
import {
  appendBetaTrackingParams,
  getBetaPlatformConfigs,
  isBetaPlatform,
  readBetaTrackingParams
} from "../../../features/beta/lib/beta-access";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  if (!isBetaPlatform(params.platform)) {
    return NextResponse.redirect(new URL("/beta", request.url));
  }

  const trackingParams = readBetaTrackingParams(request.nextUrl.searchParams);
  const destination = getBetaPlatformConfigs().find(
    (option) => option.platform === params.platform
  )?.url;

  if (!destination) {
    const fallback = new URL("/beta", request.url);
    fallback.searchParams.set("unavailable", params.platform);
    for (const [key, value] of Object.entries(trackingParams)) {
      if (value) fallback.searchParams.set(key, value);
    }
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(appendBetaTrackingParams(destination, trackingParams));
}
