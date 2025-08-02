from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def serve_index():
    return send_from_directory(os.getcwd(), 'index.html')

if __name__ == '__main__':
    # Запуск с Waitress для более высокой производительности
    from waitress import serve
    print("Сервер запущен на http://localhost:8000/")
    print("Для остановки нажмите Ctrl+C")
    serve(app, host='0.0.0.0', port=8000)