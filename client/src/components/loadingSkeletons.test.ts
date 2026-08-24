import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import RecordLoading from "./RecordLoading";
import WorkspaceListSkeleton from "./WorkspaceListSkeleton";

type LoadingRootProps = {
  className: string;
  "aria-busy": string;
  "aria-live": string;
};

describe("compact loading skeletons", () => {
  it("keeps record loading announced and supports the dark review workspace", () => {
    const skeleton = RecordLoading({ label: "Opening a review record", dark: true }) as ReactElement<LoadingRootProps>;

    expect(skeleton.props["aria-busy"]).toBe("true");
    expect(skeleton.props["aria-live"]).toBe("polite");
    expect(skeleton.props.className).toContain("bg-[#081626]");
  });

  it("keeps list loading announced and uses the civic workspace surface", () => {
    const skeleton = WorkspaceListSkeleton({ label: "Loading account role directory" }) as ReactElement<LoadingRootProps>;

    expect(skeleton.props["aria-busy"]).toBe("true");
    expect(skeleton.props["aria-live"]).toBe("polite");
    expect(skeleton.props.className).toContain("app-real-surface");
  });
});
