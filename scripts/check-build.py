"""Verify environment isolation and local asset URLs in generated HTML."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.robots = []
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("name", "").lower() == "robots":
            self.robots.append(attrs.get("content", "").lower())
        for name in ("href", "src", "poster"):
            if name in attrs:
                self.urls.append((tag, name, attrs[name]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=["staging", "production"], required=True)
    parser.add_argument("--base", default="/tech-blog")
    args = parser.parse_args()
    root = Path("dist")
    pages = list(root.rglob("*.html"))
    if not pages:
        raise SystemExit("No generated HTML pages")
    errors = []
    for file in pages:
        page = Page()
        page.feed(file.read_text())
        noindex = any("noindex" in value for value in page.robots)
        if noindex != (args.target == "staging"):
            errors.append(f"{file}: incorrect noindex for {args.target}")
        for tag, attribute, value in page.urls:
            if not value.startswith("/") or value.startswith("//"):
                continue
            path = unquote(urlsplit(value).path)
            prefix = args.base.rstrip("/")
            if args.target == "staging":
                if path != prefix and not path.startswith(prefix + "/"):
                    errors.append(f"{file}: URL outside Pages base: {value}")
                    continue
                path = path[len(prefix):] or "/"
            elif path == prefix or path.startswith(prefix + "/"):
                errors.append(f"{file}: staging base leaked into production: {value}")
            if attribute in ("src", "poster") or tag == "link":
                asset = root / path.lstrip("/")
                if not asset.is_file():
                    errors.append(f"{file}: missing asset: {value}")
    if args.target == "staging" and (root / "_worker.js").exists():
        errors.append("Cloudflare worker output included in Pages build")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Verified {len(pages)} HTML pages ({args.target})")


if __name__ == "__main__":
    main()
