/** Scroll to the home specialty list, or open the home page at that list. */
export function openSpecialties(
  pathname: string,
  push: (href: string) => void
) {
  if (pathname === "/") {
    const target = document.getElementById("specialties");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
  push("/#specialties");
}
