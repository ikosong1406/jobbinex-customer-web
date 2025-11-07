import { Link } from "react-router-dom";

function Logo() {
  return (
    <div>
      <Link
        to="/"
        className="text-2xl font-extrabold text-[var(--color-white)]"
      >
        <span className="text-[var(--color-primary)]">JOB</span>BINEX
      </Link>
    </div>
  );
}

export default Logo;
