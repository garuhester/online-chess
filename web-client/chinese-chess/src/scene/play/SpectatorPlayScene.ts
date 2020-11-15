import messager from "../../component/messager";
import socketClient from "../../online/socket";
import Room from "../../online/socket-message/response/Room";
import AbstractScene from "../AbstractScene";
import Channel from "../../online/chat/Channel";
import SceneContext from "../SceneContext";
import DisplayChessboard from "./DisplayChessboard";
import Player from "./Player";
import ChessHost from "../../rule/chess_host";
import TextOverlay from "./TextOverlay";
import confirmRequest from '../../rule/confirm_request';
import UserInfoPane from "./UserInfoPane";
import RoomUser from "../../online/socket-message/response/RoomUser";
import ChessAction from "../../rule/ChessAction";
import CHESS_CLASS_KEY_MAP from "../../rule/chess_map";
import ChannelManager from "../../online/chat/ChannelManager";
import ChannelType from "../../online/chat/ChannelType";
import ChessPos from "../../rule/ChessPos";

export default class SpectatorPlayScene extends AbstractScene {
    // socket消息监听器
    private listeners = {};
    private channelManager: ChannelManager;
    private viewChessHost: ChessHost;
    private player: Player;
    private room: Room;
    private chessboard: DisplayChessboard;
    private textOverlay = new TextOverlay();
    private userInfoPaneGroup = new eui.Group();
    private redChessUser: RoomUser;
    private blackChessUser: RoomUser;
    private redChessUserInfoPane = new UserInfoPane();
    private blackChessUserInfoPane = new UserInfoPane();
    private lblSpectatorNum = new eui.Label();

    constructor(context: SceneContext, roomRoundState: any, channelManager: ChannelManager) {
        super(context);

        this.channelManager = channelManager;

        let layout = new eui.VerticalLayout();
        layout.paddingLeft = 8;
        layout.paddingTop = 8;
        layout.paddingRight = 8;
        layout.paddingBottom = 8;
        let group = new eui.Group();
        group.layout = layout;
        this.addChild(group);

        this.player = new Player();
        this.player.onWin = this.onWin.bind(this);
        this.player.onTurnActiveChessHost = this.onTurnActiveChessHost.bind(this);
        this.chessboard = this.player.chessboard;
        this.viewChessHost = ChessHost.BLACK;
        this.room = roomRoundState.room;

        // 头部
        let head = new eui.Group();
        head.height = 60;
        head.layout = new eui.VerticalLayout();
        group.addChild(head);

        let headInfoLayout = new eui.HorizontalLayout();
        headInfoLayout.horizontalAlign = egret.HorizontalAlign.JUSTIFY;
        let headInfo = new eui.Group();
        headInfo.width = 510;
        headInfo.layout = headInfoLayout;
        headInfo.height = 20;

        let lblRoomName = new eui.Label();
        lblRoomName.width = 300;
        lblRoomName.size = 20;
        lblRoomName.text = '房间: ' + this.room.name;
        headInfo.addChild(lblRoomName);

        let { lblSpectatorNum } = this;
        lblSpectatorNum.size = 20;
        headInfo.addChild(lblSpectatorNum);

        head.addChild(headInfo);

        this.updateSpectatorCount(this.room.spectatorCount);

        let userPaneLayout = new eui.HorizontalLayout();
        userPaneLayout.gap = 200;
        userPaneLayout.horizontalAlign = egret.HorizontalAlign.JUSTIFY;
        this.userInfoPaneGroup.width = 510;
        this.userInfoPaneGroup.layout = userPaneLayout;
        this.addUserInfoPaneByView();
        head.addChild(this.userInfoPaneGroup);

        roomRoundState.room.users.forEach(user => {
            if (user.chessHost == ChessHost.BLACK) {
                this.blackChessUser = user;
            } else {
                this.redChessUser = user;
            }
        });
        this.redChessUserInfoPane.load(this.redChessUser);
        this.blackChessUserInfoPane.load(this.blackChessUser);

        group.addChild(this.player);

        let buttonGroup = new eui.Group();
        let buttonGroupLayout = new eui.HorizontalLayout();
        buttonGroupLayout.horizontalAlign = egret.HorizontalAlign.JUSTIFY;
        buttonGroupLayout.paddingTop = 32;
        buttonGroupLayout.paddingRight = 16;
        buttonGroupLayout.gap = 24;
        buttonGroup.layout = buttonGroupLayout;
        group.addChild(buttonGroup);

        // 离开按钮
        let btnLeave = new eui.Button();
        btnLeave.width = 120;
        btnLeave.height = 50;
        btnLeave.label = "离开房间";
        btnLeave.addEventListener(egret.TouchEvent.TOUCH_TAP, () => {
            socketClient.send('spectator.leave');
            this.popScene();
        }, this);
        buttonGroup.addChild(btnLeave);

        // 切换视角按钮
        let btnViewChange = new eui.Button();
        btnViewChange.width = 120;
        btnViewChange.height = 50;
        btnViewChange.label = "切换视角";
        btnViewChange.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onViewChangeClick, this);
        buttonGroup.addChild(btnViewChange);

        this.chessboard.addChild(this.textOverlay);
        if (roomRoundState.room.status == 2) {
            this.textOverlay.show('等待对局开始');
        }

        this.loadRoundState(roomRoundState);

        this.addEventListener(egret.Event.ADDED_TO_STAGE, () => {
            buttonGroup.width = this.stage.stageWidth;
        }, this);
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, (event: egret.TextEvent) => {
            this.context.chatOverlay.popOut();
        }, this);

        this.initListeners();

        let channel = new Channel();
        channel.id = this.room.channelId;
        channel.name = `当前房间`;
        channel.type = ChannelType.ROOM;
        this.channelManager.joinChannel(channel);
    }

    onSceneExit() {
        for (let key in this.listeners) {
            socketClient.signals[key].remove(this.listeners[key]);
        }

        this.channelManager.leaveChannel(this.room.channelId);
    }

    private initListeners() {
        this.listeners['spectator.join'] = (msg: any) => {
            this.updateSpectatorCount(msg.spectatorCount);
        };

        this.listeners['spectator.leave'] = (msg: any) => {
            this.updateSpectatorCount(msg.spectatorCount);
        };

        this.listeners['room.join'] = (msg: any) => {
            this.textOverlay.show('玩家加入', 3000);
            
            // 新加进来的用户如果是持红棋，则原来红棋的用户现在持黑棋
            if (msg.user.chessHost == ChessHost.RED) {
                this.blackChessUser = this.redChessUser;
                this.blackChessUser.chessHost = ChessHost.BLACK;
                this.redChessUser = msg.user;
            } else {
                this.redChessUser = this.blackChessUser;
                this.redChessUser.chessHost = ChessHost.RED;
                this.blackChessUser = msg.user;
            }

            this.redChessUserInfoPane.load(this.redChessUser);
            this.blackChessUserInfoPane.load(this.blackChessUser);
        };
        
        this.listeners['room.leave'] = (msg: any) => {
            let leaveChessHost: ChessHost;
            if (this.redChessUser && msg.user.id == this.redChessUser.id) {
                this.redChessUser = null;
                leaveChessHost = ChessHost.RED;
            } else {
                this.blackChessUser = null;
                leaveChessHost = ChessHost.BLACK;
            }

            this.textOverlay.show(`${leaveChessHost == ChessHost.RED ? '红方' : '黑方'}玩家离开`);

            (leaveChessHost == ChessHost.RED
                ? this.redChessUserInfoPane
                : this.blackChessUserInfoPane).load(null);
            
            if (this.redChessUser == null && this.blackChessUser == null) {
                messager.info('观看房间玩家已全部离开', this.stage);
                this.popScene();
                return;
            }

            this.redChessUserInfoPane.setActive(false);
            this.blackChessUserInfoPane.setActive(false);
        };

        this.listeners['chessplay.ready'] = (msg: any) => {
            let readyStatuText = msg.readyed ? '已经准备' : '取消准备';
            if (this.redChessUser && msg.uid == this.redChessUser.id) {
                this.redChessUser.readyed = msg.readyed;
                this.textOverlay.show(`红方${readyStatuText}`);
            }
            if (this.blackChessUser && msg.uid == this.blackChessUser.id) {
                this.blackChessUser.readyed = msg.readyed;
                this.textOverlay.show(`黑方${readyStatuText}`);
            }
        };

        this.listeners['spectator.chessplay.round_start'] = (msg: any) => {
            this.textOverlay.show('对局开始', 3000);
            this.player.startRound(this.viewChessHost);

            let redChessUser: RoomUser;
            let blackChessUser: RoomUser;
            [this.redChessUser, this.blackChessUser].forEach(user => {
                if (user.id == msg.redChessUid) {
                    redChessUser = user;
                }
                if (user.id == msg.blackChessUid) {
                    blackChessUser = user;
                }
            });
            if (this.redChessUser != redChessUser || this.blackChessUser != blackChessUser) {
                this.redChessUser = redChessUser;
                this.redChessUser.chessHost = ChessHost.RED;
                this.blackChessUser = blackChessUser;
                this.blackChessUser.chessHost = ChessHost.BLACK;
                this.redChessUserInfoPane.load(this.redChessUser);
                this.blackChessUserInfoPane.load(this.blackChessUser);
            }
            this.redChessUserInfoPane.setActive(false);
            this.blackChessUserInfoPane.setActive(false);
        };

        this.listeners['chessplay.chess_pick'] = (msg) => {            
            this.player.pickChess(msg.pickup, msg.pos, msg.chessHost);
        };

        this.listeners['chessplay.chess_move'] = (msg: any) => {
            this.player.moveChess(msg.fromPos, msg.toPos, msg.chessHost, msg.moveType == 2);
        };
    
        this.listeners['chessplay.confirm_request'] = (msg: any) => {
            let text = msg.chessHost == ChessHost.BLACK ? '黑方' : '红方';
            text += `请求${confirmRequest.toReadableText(msg.reqType)}`;
            this.textOverlay.show(text);
        };
        
        this.listeners['chessplay.confirm_response'] = (msg: any) => {
            let text = '';
            text += msg.chessHost == ChessHost.BLACK ? '黑方' : '红方';
            text += msg.ok ? '同意' : '不同意';
            text += confirmRequest.toReadableText(msg.reqType);
            this.textOverlay.show(text, 4000);

            if (!msg.ok) {
                return;
            }

            switch (msg.reqType) {
                case confirmRequest.Type.WHITE_FLAG:
                    this.onWin(msg.chessHost, true);
                    break;
                case confirmRequest.Type.DRAW:
                    this.onWin(null, true);
                    break;
                case confirmRequest.Type.WITHDRAW:
                    this.player.withdraw();
                    break;
            }
        };

        this.listeners['chat.message'] = (msg: any) => {
            if (msg.channelId == this.room.channelId && msg.sender.id != 0) {
                this.channelManager.openChannel(this.room.channelId);
                this.context.chatOverlay.popIn();
            }
        };

        for (let key in this.listeners) {
            socketClient.add(key, this.listeners[key]);
        }
    }

    private loadRoundState(roomRoundState: any) {
        this.player.startRound(this.viewChessHost, roomRoundState.activeChessHost, roomRoundState.chesses);
        if (!(roomRoundState.actionStack && roomRoundState.actionStack.length)) {
            return;
        }
        let actionStack: Array<ChessAction> = roomRoundState.actionStack.map(act => {
            let action = new ChessAction();
            action.chessHost = ChessHost[<string>act.chessHost];
            action.chessType = CHESS_CLASS_KEY_MAP[act.chessType];
            action.fromPos = ChessPos.make(act.fromPos);
            action.toPos = ChessPos.make(act.toPos);
            if (act.eatenChess) {
                let chessClass = CHESS_CLASS_KEY_MAP[act.eatenChess.type];
                let chess = new chessClass(
                    this.player.convertViewPos(act.toPos, action.chessHost),
                    ChessHost[<string>act.eatenChess.chessHost]);
                action.eatenChess = chess;
            }
            return action;
        });
        this.player.loadActionStack(actionStack);

        let lastAction = actionStack[actionStack.length - 1];
        let { chessHost, fromPos, toPos } = lastAction;
        this.player.fromPosTargetDrawer.draw(this.player.convertViewPos(fromPos, chessHost));
        let chess = this.chessboard.chessAt(this.player.convertViewPos(toPos, chessHost));
        if (chess) {
            chess.setLit(true);
        }
    }

    private onViewChangeClick() {
        this.player.reverseChessLayoutView();
        this.viewChessHost = ChessHost.reverse(this.viewChessHost);
        this.userInfoPaneGroup.removeChild(this.redChessUserInfoPane);
        this.userInfoPaneGroup.removeChild(this.blackChessUserInfoPane);
        this.addUserInfoPaneByView();
    }

    private onTurnActiveChessHost(activeChessHost: ChessHost) {
        this.redChessUserInfoPane.setActive(activeChessHost == ChessHost.RED);
        this.blackChessUserInfoPane.setActive(activeChessHost == ChessHost.BLACK);
    }
    
    private onWin(winChessHost: ChessHost, delay: boolean = false) {
        this.redChessUser.readyed = false;
        this.blackChessUser.readyed = false;
        setTimeout(() => {
            this.textOverlay.show(winChessHost == null
                ? '平局'
                : `${winChessHost == ChessHost.RED ? '红方' : '黑方'}赢！`);
        }, delay ? 2000 : 0);

        setTimeout(() => {
            this.textOverlay.show('等待新对局开始');
        }, 5000);
    }

    private updateSpectatorCount = (count: number) => {
        this.lblSpectatorNum.text = `观众数: ${count}`;
    }

    private addUserInfoPaneByView() {
        let left: UserInfoPane;
        let right: UserInfoPane;
        if (this.viewChessHost == ChessHost.RED) {
            left = this.blackChessUserInfoPane;
            right = this.redChessUserInfoPane;
        } else {
            left = this.redChessUserInfoPane;
            right = this.blackChessUserInfoPane;
        }

        this.userInfoPaneGroup.addChild(left);
        this.userInfoPaneGroup.addChild(right);
    }
}