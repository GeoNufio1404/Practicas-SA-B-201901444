export default function AmbientBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-[10%] -top-[10%] h-[50vw] w-[50vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(115,226,255,0.15) 0%, rgba(5,20,36,0) 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-[15%] -right-[10%] h-[55vw] w-[55vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(115,226,255,0.10) 0%, rgba(5,20,36,0) 70%)' }}
      />
    </>
  );
}
