import path from "path";

export const relative = (from: string, to: string) => {
  const rel = path.relative(from, to);
  return rel.startsWith(".") ? rel : "./" + rel;
};

export const pathWithoutExt = (p: string) => {
  const { name, dir } = path.parse(p);
  return path.join(dir, name);
};

export const getRelativePathWithoutExt = (p: string) => {
  const rel = pathWithoutExt(p);
  return rel.startsWith(".") ? rel : "./" + rel;
};
