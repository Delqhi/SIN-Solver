import json
import os
import fcntl

class TaskManager:
    def __init__(self, db_path=".opencode/tasks.json"):
        self.db_path = db_path
        if not os.path.exists(self.db_path):
            self._save_tasks({"tasks": []})

    def _load_tasks(self):
        with open(self.db_path, 'r') as f:
            # File locking verhindert, dass 2 Accounts gleichzeitig schreiben
            fcntl.flock(f, fcntl.LOCK_SH)
            data = json.load(f)
            fcntl.flock(f, fcntl.LOCK_UN)
            return data

    def _save_tasks(self, data):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with open(self.db_path, 'w') as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            json.dump(data, f, indent=4)
            fcntl.flock(f, fcntl.LOCK_UN)

    def get_next_available_task(self, agent_id):
        data = self._load_tasks()
        completed_ids = [t['id'] for t in data['tasks'] if t['status'] == 'completed']

        for task in data['tasks']:
            # Bedingungen für einen freien Task:
            # 1. Status ist pending
            # 2. Alle Abhängigkeiten sind in completed_ids enthalten
            if task['status'] == 'pending':
                deps_met = all(dep in completed_ids for dep in task.get('dependencies', []))
                if deps_met:
                    task['status'] = 'running'
                    task['locked_by'] = agent_id
                    self._save_tasks(data)
                    return task
        return None

    def update_task_status(self, task_id, status):
        data = self._load_tasks()
        for task in data['tasks']:
            if task['id'] == task_id:
                task['status'] = status
                break
        self._save_tasks(data)

    def add_task(self, task_id, description, dependencies=None):
        data = self._load_tasks()
        new_task = {
            "id": task_id,
            "description": description,
            "status": "pending",
            "dependencies": dependencies or [],
            "locked_by": None
        }
        data['tasks'].append(new_task)
        self._save_tasks(data)

    def list_tasks(self):
        data = self._load_tasks()
        return data['tasks']

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Task Manager CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Add task
    add_parser = subparsers.add_parser("add")
    add_parser.add_argument("id")
    add_parser.add_argument("description")
    add_parser.add_argument("--deps", nargs="*", help="Dependencies")

    # List tasks
    list_parser = subparsers.add_parser("list")

    # Update task
    update_parser = subparsers.add_parser("update")
    update_parser.add_argument("id")
    update_parser.add_argument("status")

    args = parser.parse_args()
    tm = TaskManager()

    if args.command == "add":
        tm.add_task(args.id, args.description, args.deps)
        print(f"✅ Task {args.id} added.")
    elif args.command == "list":
        tasks = tm.list_tasks()
        for t in tasks:
            print(f"[{t['status']}] {t['id']}: {t['description']}")
    elif args.command == "update":
        tm.update_task_status(args.id, args.status)
        print(f"✅ Task {args.id} updated to {args.status}.")
