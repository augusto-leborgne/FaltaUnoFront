"use client"

export function TestSimpleForm() {
  const handleSubmit = (e: React.FormEvent) => {
    console.log("🔥 SUBMIT HANDLER CALLED")
    e.preventDefault()
    console.log("✅ preventDefault executed")
    alert("Form submitted!")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-lg xs:text-xl sm:text-2xl font-bold mb-4">Test Form</h1>
        <input 
          type="text" 
          placeholder="Test input"
          className="w-full border p-2 rounded mb-4"
        />
        <button 
          type="submit"
          onClick={() => console.log("🔴 BUTTON CLICKED")}
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
        >
          Test Submit
        </button>
      </form>
    </div>
  )
}
