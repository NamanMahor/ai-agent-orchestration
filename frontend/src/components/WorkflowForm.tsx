import { useState } from "react";

type Props = {
  onSubmit: (
    workflow: {
      name: string;
      description: string;
      schedule?: string;
    }
  ) => Promise<void>;
};

export default function WorkflowForm({
  onSubmit,
}: Props) {

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [schedule, setSchedule] =
    useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();

    await onSubmit({
      name,
      description,
      schedule: schedule || undefined,
    });

    setName("");
    setDescription("");
    setSchedule("");
  }

  return (

    <form
      onSubmit={handleSubmit}
      className="border rounded p-4 mb-6 flex flex-col gap-4"
    >

      <h2 className="text-xl font-bold">
        Create Workflow
      </h2>

      <input
        className="border p-2 rounded"
        placeholder="Workflow Name"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
      />

      <textarea
        className="border p-2 rounded"
        placeholder="Description"
        rows={3}
        value={description}
        onChange={(e) =>
          setDescription(
            e.target.value
          )
        }
      />

      <input
        className="border p-2 rounded"
        placeholder="Schedule (cron or interval)"
        value={schedule}
        onChange={(e) =>
          setSchedule(e.target.value)
        }
      />

      <button
        type="submit"
        className="bg-black text-white p-2 rounded"
      >
        Create
      </button>

    </form>
  );
}

