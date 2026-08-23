import { ShieldOff } from "lucide-react"

const AddNotAllowed = () => {
  return (
    <div className="flex flex-col h-full items-center justify-center gap- text-center">
      <span
        className="flex p-4 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: '#ffaa22' }}
      >
        <ShieldOff size={50} />
      </span>
      <h3 className="text-xl mt-4 font-medium text-[#444]">Not Allowed</h3>
      <h3 className="text-base text-[#888]">You're not allowed to add expenses to this group. Please contact the admin.</h3>
    </div>
  )
}

export default AddNotAllowed
