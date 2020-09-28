import React, { useState, useEffect, } from 'react'
import { useLocation, useHistory } from 'react-router-dom'
import io from '../Socket'
import db from '../db'
import CenterBoard from './game/center/CenterBoard'
import PlayerBoard from './game/player/PlayerBoard'
import LobbyWait from './game/player/LobbyWait'
import OpponentsList from './game/opponents/OpponentsList'

const ZERO = 'zero'

const Lobby = () => {
  const location = useLocation()
  const history = useHistory()
  const locationUuid = location.state && location.state.uuid
  const locationGame = location.state && location.state.game
  const [uuid, setUuid] = useState(null)
  const [lobby, setLobby] = useState({ room: '', players: [], size: 3, questCycle: ZERO, round: 0, quest: [], deck: [] })
  const [playerInfo, setPlayerInfo] = useState({ name: '', host: false, totalScore: 0, roundScore: 0, playerArtifacts: [], choiceMade: false, choice: null })
  
  const updateGame = async game => {
    console.log('updateGame: ', game)
    setLobby(game)
    try {
      await db.game.put(game)
    } catch (error) {
    }  
  }

  const updatePlayer = async player => {
    console.log('updatePlayer: ', player)
    setPlayerInfo(player)
    try {
      await db.player.put(player, uuid)
    } catch (error) {
    }  
  }

  const saveUuid = async uuid => {
    setUuid(uuid)
    try {
      await db.uuid.put({uuid: uuid})
    } catch (error) {
    }  
  }

  const loadSave = async () => {
    try {
      const storedUuid = await db.table('uuid').toArray()
      const storedGame = await db.table('game').toArray()
      const storedPlayer = await db.table('player').toArray()
      if(storedUuid[0] && storedGame[0] && storedPlayer[0]) {
        setUuid(storedUuid[0].uuid)
        setLobby(storedGame[0])
        setPlayerInfo(storedPlayer[0])
      } else {
        console.log('Missing some or all info, starting new')
      }
    } catch (error) {
    } 
  }

  const clearGame = () => {
    db.game.clear()
    db.uuid.clear()
    db.player.clear()
    history.push('/')
  }
  
  useEffect(() => {
    loadSave()

    io.playerInit(locationGame, locationUuid)

    io.playerUuid((uuid) => {
      saveUuid(uuid)
    })

    io.gameUpdate(update => {
      updateGame(update)
    })

    io.playerUpdate(update => {
      updatePlayer(update)
    })

    io.gameReset(() => clearGame())

    return () => {
      io.disconnect()
    }
  }, [])

  const playerChoice = ({ target: { name } }) => {
    updatePlayer({ ...playerInfo, choice: name == 'torch', choiceMade: true })
    io.sendChoice({ uuid: uuid, choice: name === 'torch' })
  }

  const roundStart = () => {
    io.startRound(lobby.room)
  }

  const choicesReveal = () => {
    io.revealChoices(lobby.room)
  }

  const turnStart = () => {
    io.startTurn({ room: lobby.room })
  }

  const gamePlayers = lobby.players.filter(player => player.uuid !== uuid).map((player, ind) =>(<OpponentsList key={ ind } player={ player } questCycle={ lobby.questCycle } onePlayer={ lobby.onePlayer }/>))

  const lobbyReady = lobby.players.map((player, ind) => <LobbyWait key={ player.uuid } player={ player } />)
  const lobbyWaiting = [...Array(lobby.size - lobbyReady.length)].map((_, ind) => <li key={ ind } className="bg-yellow-300 p-2">Waiting...</li>)
  const lobbyPlayers = [...lobbyReady, ...lobbyWaiting]

  return (
    <div className="p-2 flex flex-col flex-wrap">

      {/*///// admin /////*/}
      <div className="flex p-1 bg-yellow-200 mr-auto">
        <button className="inline-block p-1 bg-gray-300" to="/" onClick={ clearGame } >Clear Game</button>
        <div className="p-1">Code: { lobby.room }</div>
        <div className="p-1">uuid: { uuid && uuid.substring(0, 4) }</div>
      </div>
      {/*///// admin /////*/}
      
      <div className="p-1 flex flex-col flex-wrap justify-center">
        { lobby.size != lobbyReady.length ?

        /*///// lobby list /////*/
        <div className="flex flex-col">
          <ul className="flex flex-row justify-around">
            { lobbyPlayers }
          </ul>
          <div className="flex bg-orange-600 justify-center mx-auto mt-4">Waiting on all players...</div> 
          <div className="flex p-2 mt-4 items-center justify-center">
            Join Code: <span className="p-2 bg-green-400 font-bold">{ lobby.room }</span>
          </div>
          
        </div>

        :

        /*///// game /////*/
        <div>
          {/*///// player list /////*/}
          <ul className="flex flex-row justify-around">
            { gamePlayers }
          </ul>

          {/*///// center board /////*/}
          <CenterBoard round={ lobby.round } quest={ lobby.quest } roundStart={ roundStart } questCycle={ lobby.questCycle } choicesReveal={ choicesReveal } spare={ lobby.spare } turnStart={ turnStart } endCamp={ lobby.endCamp } endHazard={ lobby.endHazard } onePlayer={ lobby.onePlayer } playerInfo={ playerInfo }/>

          {/*///// player board /////*/}
          <PlayerBoard player={ playerInfo } playerChoice={ playerChoice } questCycle={ lobby.questCycle } onePlayer={ lobby.onePlayer }/>
        </div> }
      </div>
    </div>
  )
}

export default Lobby