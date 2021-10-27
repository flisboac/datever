Expression = expr:( BinaryExpression / UnitExpression ) { return expr; }

UnitExpression = _? value:(VersionOrRange / Duration) _? {
	return { type: 'IDENTITY_EXPR', value };
}

BinaryExpression = OrExpression

OrExpression = _? lhs:VersionOrRange _? operator:OrOp _? rhs:Expression _? {
	const node = { type: 'MULTI_OPERAND_EXPR', operator, operands: [lhs, rhs] };
    if (rhs.type === 'MULTI_OPERAND_EXPR' && rhs.operator === node.operator) {
    	node.operands.push(...rhs.operands);
    }
    return node;
}

VersionOrRange = BoundedRange / BriefRange

VersionNumber = Y:YearPart DatePartSep? M:MonthPart DatePartSep? D:DayPart DateTimeSep? h:HourPart TimePartSep? m:MinPart TimePartSep? s:SecPart SubSecSep? u:SubSecPart? TimeZonePart? {
	return { type: 'VERSION', Y, M, D, h, m, s, u };
}

YearRange = Y:YearPart { return { type: 'YEAR_RANGE', Y }; }
MonthRange = Y:YearPart DatePartSep? M:MonthPart { return { type: 'MONTH_RANGE', Y, M }; }
DayRange = Y:YearPart DatePartSep? M:MonthPart DatePartSep? D:DayPart { return { type: 'DAY_RANGE', Y, M, D }; }
HourRange = Y:YearPart DatePartSep? M:MonthPart DatePartSep? D:DayPart DateTimeSep? h:HourPart { return { type: 'HOUR_RANGE', Y, M, D, h }; }
MinRange = Y:YearPart DatePartSep? M:MonthPart DatePartSep? D:DayPart DateTimeSep? h:HourPart TimePartSep? m:MinPart { return { type: 'MINUTE_RANGE', Y, M, D, h, m }; }
BriefRange = VersionNumber / MinRange / HourRange / DayRange / MonthRange / YearRange

BoundedRange = LowerUpperRange / LowerBoundRange / UpperBoundRange
BoundedRangePart = VersionNumber / BriefRange
LowerUpperRange = IsoFormatBoundedRange / CloseBoundRange / IsoFormatBoundedRange / LowerIsoBoundedRange / UpperIsoBoundedRange

LowerBoundRange = anchor:LowerBoundOp _? lower:BoundedRangePart { return { anchor, lower, type: 'LOWER_BOUNDED_RANGE' }; }
UpperBoundRange = anchor:UpperBoundOp _? upper:BoundedRangePart { return { anchor, upper, type: 'UPPER_BOUNDED_RANGE' }; }
CloseBoundRange = lower:LowerBoundRange _? upper:UpperBoundRange { return { lower, upper, type: 'FULLY_BOUNDED_RANGE' }; }
IsoFormatBoundedRange = lower:BoundedRangePart _? IsoTimeIntervalSep _? upper:BoundedRangePart { return { lower, upper, type: 'FULLY_BOUNDED_RANGE' }; }
LowerIsoBoundedRange = lower:BoundedRangePart _? IsoTimeIntervalSep _? duration:Duration { return { lower, duration, type: 'LOWER_DURATION_RANGE' }; }
UpperIsoBoundedRange = duration:Duration _? IsoTimeIntervalSep _? upper:BoundedRangePart { return { upper, duration, type: 'UPPER_DURATION_RANGE' }; }

Duration =
	"P"
    duration:(
      ( date:DurationDatePart time:DurationTimePart  { return { ...date, ...time, type: 'DURATION' }; } )
      / ( time:DurationTimePart  { return { ...time, type: 'DURATION' }; } )
      / ( date:DurationDatePart  { return { ...date, type: 'DURATION' }; } )
  	)
 	{ return duration; }
DurationDatePart
	= ( Y:DurationYearPart M:DurationMonthPart? D:DurationDayPart? { return { Y, M, D }; } )
    / ( M:DurationMonthPart D:DurationDayPart? { return { M, D }; } )
    / ( D:DurationDayPart { return { D }; } )
DurationTimePart =
	"T"
    value:(
    	hms:( h:DurationHourPart m:DurationMinPart? s:DurationSecPart? { return { h, m, s }; } )
        / ms:( m:DurationMinPart s:DurationSecPart? { return { m, s }; })
        / s:( s:DurationSecPart { return { s }; } )
      	{ return hms || ms || s; }
    )
    { return value; }
DurationYearPart = digit:(Digit+) "Y" { return parseInt(digit.join("")); }
DurationMonthPart = digit:(Digit+) "M" { return parseInt(digit.join("")); }
DurationDayPart = digit:(Digit+) "D" { return parseInt(digit.join("")); }
DurationHourPart = digit:(Digit+) "H" { return parseInt(digit.join("")); }
DurationMinPart = digit:(Digit+) "M" { return parseInt(digit.join("")); }
DurationSecPart = digit:(Digit+) "S" { return parseInt(digit.join("")); }

SubSecSep "string" = [\.\-_]
DateTimeSep "string" = [T_]
TimePartSep "string" = [\-:]
DatePartSep "string" = [\-]

YearPart "integer" = Digit Digit Digit Digit {
	return parseInt(text());
}
MonthPart "integer" = Digit Digit {
	const value = parseInt(text());
    if (value <= 0 || value > 12) {
    	throw new Error('Month must be between 1 and 12.');
    }
    return value;
}
DayPart "integer" = Digit Digit {
	const value = parseInt(text());
    if (value > 31) {
    	throw new Error('Day of the month cannot be greater than 31.');
    }
    return value;
}
HourPart "integer" = Digit Digit {
	const value = parseInt(text());
    if (value > 23) {
    	throw new Error('Hour of the day cannot be greater than 23.');
    }
    return value;
}
MinPart "integer" = DigitsMax59
SecPart "integer" = DigitsMax59
SubSecPart "integer" = ( Digit Digit Digit / Digit Digit Digit Digit Digit Digit ) { return parseInt(text()); }
TimeZonePart "string" = "Z"
IsoTimeIntervalSep "string" = "/"

LowerBoundOp "string" = ">=" { return "GE"; } / ">" { return "GT"; }
UpperBoundOp "string" = "<=" { return "LE"; } / "<" { return "LT"; }

ExprOp "string" = OrOp
OrOp "string" = "||" { return "OR"; }

Digit "string" = [0-9]
DigitsMax59 "integer" = Digit Digit {
	const value = parseInt(text());
    if (value > 59) {
    	throw new Error('Day of the month cannot be greater than 59.');
    }
    return value;
}

_ "whitespace"
  = [ \t\n\r]+ { return text(); }
