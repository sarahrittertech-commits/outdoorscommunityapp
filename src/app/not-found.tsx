import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p className="mt-2">
        That page doesn&apos;t exist, or you don&apos;t have access to it. <Link href="/">Back to the board</Link>.
      </p>
    </>
  );
}
