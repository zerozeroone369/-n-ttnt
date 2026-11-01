@echo off
chcp 65001 > nul
title Đẩy Dự Án Lên GitHub - Tiệm Nhà Nhỏ
color 0A

set "PATH=C:\tools\git\cmd;C:\tools\nodejs;%PATH%"

echo ===============================================================================
echo     TIEM NHA NHO - DONG BO VA DAY CODE LEN GITHUB
echo ===============================================================================
echo.
echo  Repository: https://github.com/zerozeroone369/-n-ttnt.git
echo  Email:      nguyenngotuanhtk123@gmail.com
echo  Branch:     main
echo.
echo ===============================================================================
echo.
echo  LƯU Ý VỀ MẬT KHẨU GITHUB (Personal Access Token):
echo  Từ năm 2021, GitHub không dùng mật khẩu thường để push code mà dùng "Token".
echo.
echo  Nếu bạn đã có Token (bắt đầu bằng ghp_...):
echo  Nhập token vào bên dưới để tự động đẩy code lên ngay!
echo.
echo  Nếu chưa có Token, bạn lấy rất nhanh trong 30 giây:
echo  1. Mở link: https://github.com/settings/tokens/new
echo  2. Đặt tên (ví dụ: my-token), tích chọn ô "repo"
echo  3. Cuộn xuống cuối bấm "Generate token", copy mã ghp_... dán vào đây:
echo.
set /p TOKEN=">> Nhập GitHub Token (ghp_...) hoặc ấn Enter để thử push mặc định: "

if "%TOKEN%"=="" (
    echo.
    echo Đang đẩy code lên GitHub qua origin...
    git push -u origin main
) else (
    echo.
    echo Đang đẩy code lên GitHub với Token xác thực...
    git push -u https://%TOKEN%@github.com/zerozeroone369/-n-ttnt.git main --force
)

echo.
if %errorlevel% equ 0 (
    echo ===============================================================================
    echo  [THÀNH CÔNG] Code đã được đẩy lên GitHub thành công rực rỡ!
    echo  Xem tại: https://github.com/zerozeroone369/-n-ttnt
    echo ===============================================================================
) else (
    echo.
    echo [CHƯA THÀNH CÔNG] Vui lòng kiểm tra lại Token hoặc quyền truy cập của bạn.
)

echo.
pause
