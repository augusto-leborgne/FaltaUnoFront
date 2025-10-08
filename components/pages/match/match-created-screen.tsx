"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, Users, Share2 } from "lucide-react"
import { useRouter } from "next/navigation"

const mockFriends = [
  { id: 1, name: "Carlos M.", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 2, name: "Ana L.", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 3, name: "Diego R.", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 4, name: "Sofia P.", avatar: "/placeholder.svg?height=40&width=40" },
]

export function MatchCreatedScreen() {
  const router = useRouter()

  const handleInviteFriend = (friendId: number) => {
    console.log("Inviting friend:", friendId)
  }

  const handleFinish = () => {
    router.push("/my-matches")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Partido creado!</h1>
        <p className="text-gray-600">Tu partido ya está disponible para otros jugadores</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Invitar amigos</h3>
            <Users className="w-5 h-5 text-gray-600" />
          </div>

          <div className="space-y-3 mb-4">
            {mockFriends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-200 text-sm">
                      {friend.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-gray-900">{friend.name}</span>
                </div>
                <Button
                  onClick={() => handleInviteFriend(friend.id)}
                  size="sm"
                  variant="outline"
                  className="bg-orange-50 border-orange-200 text-gray-700 hover:bg-orange-100"
                >
                  Invitar
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100">
            <Share2 className="w-4 h-4 mr-2" />
            Compartir partido
          </Button>
        </div>

        <Button onClick={handleFinish} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl">
          Finalizar
        </Button>
      </div>
    </div>
  )
}
