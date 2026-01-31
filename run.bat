@echo off
echo ========================================
echo 银行账单智能分析系统 - MVP
echo ========================================
echo.

echo [1/3] 检查Python环境...
python --version
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)
echo.

echo [2/3] 检查依赖...
if not exist "venv\" (
    echo 首次运行，正在创建虚拟环境...
    python -m venv venv
    call venv\Scripts\activate
    echo 正在安装依赖...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)
echo.

echo [3/3] 启动应用...
echo.
echo ----------------------------------------
echo 应用已启动！
echo 请访问: http://localhost:5000
echo 按 Ctrl+C 停止服务
echo ----------------------------------------
echo.

python app.py

pause
