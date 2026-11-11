"""Restore a schema and synthetic row through pg_dump/pg_restore in disposable databases.

Reads only the application's schema. Does not dump real rows or modify the application DB.
Requires the local Compose PostgreSQL service to be running. Temporary database names are
unique; cleanup drops only databases successfully created by this invocation.
"""

from pathlib import Path
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]
PREFIX = ["docker", "compose", "exec", "-T", "db"]


def run(*args, data=None):
    return subprocess.run(
        PREFIX + list(args),
        cwd=ROOT,
        input=data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    ).stdout


def main():
    suffix = uuid.uuid4().hex[:12]
    source = "sg_backup_" + suffix
    restored = "sg_restore_" + suffix
    created = []
    try:
        schema = run(
            "pg_dump",
            "-U",
            "subguard",
            "-d",
            "subguard",
            "--schema-only",
            "--no-owner",
            "--no-privileges",
        )
        for db in (source, restored):
            run("createdb", "-U", "subguard", db)
            created.append(db)
        run(
            "psql", "-U", "subguard", "-d", source, "-v", "ON_ERROR_STOP=1", data=schema
        )
        run(
            "psql",
            "-U",
            "subguard",
            "-d",
            source,
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            "INSERT INTO users (telegram_id,language_code,is_demo,first_name) VALUES (-1,'en',true,'Restore check');",
        )
        backup = run(
            "pg_dump",
            "-U",
            "subguard",
            "-d",
            source,
            "-Fc",
            "--no-owner",
            "--no-privileges",
        )
        run(
            "pg_restore",
            "-U",
            "subguard",
            "-d",
            restored,
            "--exit-on-error",
            "--no-owner",
            "--no-privileges",
            data=backup,
        )
        value = (
            run(
                "psql",
                "-U",
                "subguard",
                "-d",
                restored,
                "-tAc",
                "SELECT first_name FROM users WHERE telegram_id=-1",
            )
            .decode()
            .strip()
        )
        if value != "Restore check":
            raise RuntimeError("Restored fixture did not match")
        print(
            "PASS: application schema and synthetic user survived pg_dump/pg_restore."
        )
    finally:
        for db in reversed(created):
            run("dropdb", "-U", "subguard", db)


if __name__ == "__main__":
    main()
