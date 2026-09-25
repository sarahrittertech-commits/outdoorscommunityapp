import { errorText, noticeText } from "@/lib/messages";

type SearchParams = Record<string, string | string[] | undefined>;

/** The message a form left behind (?m= or ?e=). Only known codes are shown. */
export function Notice({ params }: { params: SearchParams }) {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const notice = noticeText(first(params.m));
  const error = errorText(first(params.e));
  if (!notice && !error) return null;

  return error ? (
    <p role="alert" className="mb-4 rounded border border-danger px-3 py-2 text-danger">
      {error}
    </p>
  ) : (
    <p role="status" className="mb-4 rounded bg-notice px-3 py-2">
      {notice}
    </p>
  );
}
