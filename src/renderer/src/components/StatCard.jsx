/**
 * Tarjeta de estadística con barra de progreso
 * Muestra una métrica con su valor actual, máximo y porcentaje de uso
 *
 * @param {string} title - Título de la estadística
 * @param {string|number} value - Valor actual
 * @param {string|number} max - Valor máximo (opcional)
 * @param {number} percentage - Porcentaje de uso (0-100, opcional)
 * @param {string} subtitle - Subtítulo adicional (opcional)
 *
 * @example
 * ```jsx
 * <StatCard
 *   title="Uso de Memoria"
 *   value="45.2 MB"
 *   max="100 MB"
 *   percentage={45.2}
 * />
 * ```
 */
function StatCard({ title, value, max, percentage, subtitle }) {
    // Determinar color según porcentaje de uso
    const getColor = (percent) => {
        if (percent === undefined) return '#4caf50'; // Verde por defecto
        if (percent > 90) return '#ff4444'; // Rojo
        if (percent > 70) return '#ffaa00'; // Amarillo
        return '#4caf50'; // Verde
    };

    return (
        <div className="stat-card">
            <h5 className="stat-title">{title}</h5>
            <div className="stat-value">
                {value} {max && <span className="stat-max">/ {max}</span>}
            </div>

            {/* Barra de progreso si se proporciona porcentaje */}
            {percentage !== undefined && (
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: getColor(percentage)
                        }}
                    />
                </div>
            )}

            {/* Subtítulo opcional */}
            {subtitle && <div className="stat-subtitle">{subtitle}</div>}
        </div>
    );
}

export default StatCard;
