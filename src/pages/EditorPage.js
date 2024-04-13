import React, { useEffect, useRef, useState } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import {initSocket} from '../socket';
import ACTIONS from '../Actions';
import { useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
const EditorPage = () => {
    const socketRef = useRef(null);
    const location = useLocation();
    const codeRef = useRef(null);
    const {roomId} = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    useEffect(() => {
        const init = async () => {

            socketRef.current = await initSocket();
            socketRef.current.on('connect-error', (err)=> handleErrors(err));
            socketRef.current.on('connect-failed', (err)=> handleErrors(err));
            function handleErrors(err){
                console.log('socket error', err);
                toast.error('Socket Connection Error!, Try Again!');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });
            //listening for joined event
            socketRef.current.on(ACTIONS.JOINED, ({clients, username, socketId}) => {
                if(username !== location.state?.username){
                    toast.success(`${username} joined the room`);
                    console.log(`${username} joined the room`);
                }
                setClients(clients);
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    code: codeRef.current,
                    socketId,
                });    
            });
            //listening for disconnected event
            socketRef.current.on(ACTIONS.DISCONNECTED, ({socketId, username}) => {
                toast.success(`${username} left the room`);
                console.log(`${username} left the room`);
                setClients((prev) => {
                    return prev.filter(client => client.socketId !== socketId);
                })
            });

        }
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        }
    }, []);

    async function copyRoomId(){
        try{
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard'); 
        } catch(err){
            toast.error('Failed to copy Room ID');
            console.error('Failed to copy Room ID', err);
        }
    }

    function leaveRoom(){
        reactNavigator('/');
    }

    if(!location.state){
        return <Navigate to="/"/>
    }
    

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImg"
                            src="/code-sync.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <Editor
                 socketRef = {socketRef}
                 roomId = {roomId}
                 onCodeChange={(code) => {
                    codeRef.current = code;
                 }}
                />
            </div>
        </div>
    );
};

export default EditorPage;
