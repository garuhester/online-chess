package io.github.hulang1024.chinesechess.room;

import lombok.Data;

@Data
public class CreateRoomParam {
    private String name;
    private String password;
    /**
     * 局时（分钟）
     */
    private float gameDuration;
    /**
     * 步时（分钟）
     */
    private float stepDuration;
    /**
     * 读秒
     */
    private int secondsCountdown;

    public RoomSettings getRoomSettings() {
        RoomSettings roomSettings = new RoomSettings();
        // 转换为秒
        roomSettings.setGameDuration((int)(gameDuration * 60));
        roomSettings.setStepDuration((int)(stepDuration * 60));
        roomSettings.setSecondsCountdown(secondsCountdown);
        return roomSettings;
    }
}