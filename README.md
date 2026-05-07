# AFSIM 开发工具

适用于 AFSIM（高级仿真、集成与建模框架）场景开发的 VSCode 扩展。提供语法高亮、智能补全、悬停信息、跳转到定义、查找引用以及仿真执行功能。

## 功能特性

### 语法高亮

全面支持 AFSIM 语法，包括配置块（`platform_type`、`sensor`、`processor` 等）、脚本块、嵌套结构和注释。

### 自动补全

- **配置块**：嵌套块关键字、配置项、预定义类型继承（例如 `WSF_RADAR_SENSOR` 继承自 `sensor` 并附加额外配置项）、`edit`/`add`/`delete` 操作符、数字后单位
- **脚本块**：脚本类型（`int`、`double`、`WsfPlatform` 等）、全局常量（`PLATFORM`、`SELF`、`TRACK` 等）、内置函数（`writeln`、`abs`、`sin` 等）、控制关键字、`.` 或 `->` 后的成员补全（包含完整方法签名和重载信息）
- **script_variables 块**：变量声明时的类型名称（`int`、`double`、`string`、`bool`、`extern`、`WsfPlatform`、`Array<>` 等）
- **链式方法调用**：`pla.Weapon().QuantityRemaining()` —— 通过方法链解析返回类型

### 悬停信息

在脚本块中将鼠标悬停于任何标识符上，即可查看：
- 全局常量的类型和描述
- 脚本类型信息
- 内置函数签名（支持重载）
- 对于 `.` 之前的表达式解析出的类方法签名（例如，悬停在 `pla.Weapon()` 中的 `Weapon` 上会显示 `WsfWeapon Weapon()`）
- 用户自定义变量的类型和 extern 状态
- 用户自定义函数的签名

### 跳转到定义

- **脚本上下文**：跨所有打开的文件以及通过 `include_once` 引用的文件，跳转到变量或函数定义
- **配置上下文**：跳转到用户自定义的类型定义（平台、传感器、武器等）
- 支持单字母变量名

### 查找引用

右键单击任何变量、函数或类型名称，选择“查找所有引用”，即可查看工作区中所有文档（包括通过 `include_once` 引用的文件）中的每一次定义和使用位置。

### 运行仿真

使用 `mission.exe` 执行当前场景文件：

- **命令面板**：`AFSIM: 使用 mission.exe 运行`
- **键盘快捷键**：`Ctrl+F5`
- **编辑器上下文菜单**：右键 → 运行任务
- **编辑器标题栏**：点击运行按钮

首次运行时，系统会提示你选择 `mission.exe`。路径将被保存以供后续使用。运行前文件会自动保存，终端工作目录设置为该文件所在的位置。

额外的命令行参数（例如 `-es`、`-sm`、`-fio`）可通过设置中的 `afsim.missionArgs` 进行配置。

## 配置

| 设置项 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `afsim.missionPath` | string | `""` | `mission.exe` 的路径。如果为空，首次运行时会提示选择。 |
| `afsim.missionArgs` | string[] | `[]` | 传递给 `mission.exe` 的额外参数（例如 `["-sm", "-fio"]`）。 |
| `afsim.scriptCompletionDelay` | number | `500` | 停止编辑后更新补全建议前的延迟时间（毫秒）。 |

## 支持的文件类型

扩展名为 `.txt` 的文件将被识别为 AFSIM 场景文件。你也可以手动将任何文件的语言模式设置为 `AFSIM`。

## 数据来源

AFSIM 领域数据（330 个脚本类、198 种预定义类型、201 条指令）提取自官方 AFSIM 文档，并编译为 `src/data/afsim-domain.json` 中的统一配置。

# AFSIM Dev Tool

VSCode extension for AFSIM (Advanced Framework for Simulation, Integration and Modeling) scenario development. Provides syntax highlighting, intelligent completion, hover info, go-to-definition, find references, and simulation execution.

## Features

### Syntax Highlighting

Full AFSIM syntax support including configuration blocks (`platform_type`, `sensor`, `processor`, ...), script blocks, nested structures, and comments.

### Auto Completion

- **Config blocks**: nested block keywords, config items, predefined type inheritance (e.g. `WSF_RADAR_SENSOR` extends `sensor` with additional config items), `edit`/`add`/`delete` operators, units after numbers
- **Script blocks**: script types (`int`, `double`, `WsfPlatform`, ...), global constants (`PLATFORM`, `SELF`, `TRACK`, ...), built-in functions (`writeln`, `abs`, `sin`, ...), control keywords, member completion after `.` or `->` with full method signatures and overload info
- **script_variables blocks**: type names (`int`, `double`, `string`, `bool`, `extern`, `WsfPlatform`, `Array<>`) for variable declarations
- **Chained method calls**: `pla.Weapon().QuantityRemaining()` — resolves return types through the method chain

### Hover Information

Hover over any identifier inside a script block to see:
- Global constant type and description
- Script type info
- Built-in function signatures (with overload support)
- Class method signatures resolved from the expression before `.` (e.g. hovering `Weapon` in `pla.Weapon()` shows `WsfWeapon Weapon()`)
- User-defined variable type and extern status
- User-defined function signatures

### Go to Definition

- **Script context**: jump to variable or function definitions across all open and `include_once`-referenced files
- **Config context**: jump to user-defined type definitions (platform, sensor, weapon, etc.)
- Works with single-letter variable names

### Find References

Right-click any variable, function, or type name and select **Find All References** to see every definition and usage across all documents in the workspace, including `include_once`-referenced files.

### Run Simulation

Execute the current scenario file with `mission.exe`:

- **Command Palette**: `AFSIM: Run with mission.exe`
- **Keyboard shortcut**: `Ctrl+F5`
- **Editor context menu**: right-click → Run Mission
- **Editor title bar**: click the run button

On first run, you will be prompted to select `mission.exe`. The path is saved for future runs. The file is automatically saved before execution, and the terminal working directory is set to the file's location.

Extra command-line arguments (e.g. `-es`, `-sm`, `-fio`) can be configured via `afsim.missionArgs` in settings.

## Configuration

| Setting | Type | Default | Description |
|---|---|---|---|
| `afsim.missionPath` | string | `""` | Path to `mission.exe`. Prompted on first run if empty. |
| `afsim.missionArgs` | string[] | `[]` | Extra arguments passed to `mission.exe` (e.g. `["-sm", "-fio"]`). |
| `afsim.scriptCompletionDelay` | number | `500` | Delay (ms) before updating completions after editing stops. |

## Supported File Types

Files with `.txt` extension are recognized as AFSIM scenarios. You can also manually set the language mode to `AFSIM` for any file.

## Data Source

AFSIM domain data (330 script classes, 198 predefined types, 201 commands) is extracted from the official AFSIM documentation and compiled into a unified config at `src/data/afsim-domain.json`.
