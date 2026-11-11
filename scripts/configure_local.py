"""Create a new local demo .env without overwriting existing settings or printing secrets."""

from pathlib import Path
import secrets

ROOT = Path(__file__).resolve().parents[1]


def main():
    target = ROOT / ".env"
    try:
        with target.open("x", encoding="utf-8") as f:
            f.write(
                "POSTGRES_PASSWORD="
                + secrets.token_hex(32)
                + "\nJWT_SECRET="
                + secrets.token_hex(32)
                + "\nDEMO_MODE_ENABLED=true\nENVIRONMENT=development\nWEB_PORT=8080\n"
            )
        target.chmod(0o600)
        print("Created .env for local browser demo. Secret values were not printed.")
    except FileExistsError:
        print("Existing .env preserved. No configuration changed.")


if __name__ == "__main__":
    main()
